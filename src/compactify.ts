/**
 * COMPACTIFY — Experience Compression
 *
 * Inspired by Lineage Engine's compactification layer.
 * Old experiences become statistical summaries that shape future behavior.
 *
 * Raw interactions → UserProfile
 *
 * "The mind doesn't remember every detail.
 *  It remembers what mattered."
 */

import type { Interaction, UserProfile, LineageConfig } from "./types.js";

const DEFAULT_STOPS = new Set([
  "the", "a", "an", "to", "and", "or", "of", "in", "on", "at", "for",
  "is", "it", "my", "i", "me", "do", "go", "get", "be", "am", "was",
  "with", "that", "this", "but", "not", "so", "up", "out", "if", "from",
  "about", "just", "can", "all", "one", "have", "has", "had", "will",
  "would", "should", "could", "been", "being", "some", "any", "no",
  "them", "they", "their", "there", "what", "when", "how", "who",
  "which", "where", "than", "then", "also", "very", "more", "most",
  "need", "want", "like", "make", "take", "come", "put", "back",
  "into", "over", "after", "before", "down", "off", "through",
]);

const DEFAULT_CONCRETE = [
  "write", "send", "call", "fix", "build", "finish", "submit",
  "reply", "deploy", "push", "create", "update", "delete", "review",
  "schedule", "book", "pay", "order", "clean", "organize",
];

/** Extract meaningful keywords from text */
export function extractKeywords(text: string, stops?: Set<string>): string[] {
  const stopSet = stops ?? DEFAULT_STOPS;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopSet.has(w));
}

/** Get top N keywords by frequency across multiple texts */
export function topKeywords(texts: string[], limit: number, stops?: Set<string>): string[] {
  const freq = new Map<string, number>();
  for (const text of texts) {
    for (const word of extractKeywords(text, stops)) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/** Find the hour (0-23) with the most interactions */
export function mostActiveHour(timestamps: string[]): number | null {
  if (timestamps.length === 0) return null;
  const hours = new Array(24).fill(0);
  for (const ts of timestamps) {
    const h = new Date(ts).getHours();
    if (!isNaN(h)) hours[h]++;
  }
  let best = 0;
  for (let i = 1; i < 24; i++) if (hours[i] > hours[best]) best = i;
  return hours[best] > 0 ? best : null;
}

/** Find the hour with the highest completion rate (min 2 samples) */
export function mostProductiveHour(
  interactions: Pick<Interaction, "created_at" | "completed">[]
): number | null {
  const total = new Array(24).fill(0);
  const completed = new Array(24).fill(0);
  for (const i of interactions) {
    const h = new Date(i.created_at).getHours();
    if (isNaN(h)) continue;
    total[h]++;
    if (i.completed) completed[h]++;
  }
  let bestHour = -1;
  let bestRate = -1;
  for (let h = 0; h < 24; h++) {
    if (total[h] >= 2) {
      const rate = completed[h] / total[h];
      if (rate > bestRate) { bestRate = rate; bestHour = h; }
    }
  }
  return bestHour >= 0 ? bestHour : null;
}

/**
 * Compactify — compress raw interactions into a statistical profile.
 *
 * This is the core Lineage concept: old experiences become signal,
 * not noise. The profile is what the AI reads, not the raw history.
 */
export function compactify(
  userId: string,
  interactions: Interaction[],
  config: LineageConfig,
  previousVersion?: number
): UserProfile {
  const window = interactions.slice(0, config.consolidation_window);
  const total = window.length;
  const done = window.filter((i) => i.completed);
  const abandoned = window.filter((i) => !i.completed);
  const completionRate = total > 0 ? done.length / total : 0;

  // Duration analysis
  const durations = done
    .map((i) => i.duration_seconds ?? 0)
    .filter((d) => d > 0);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  // Topic extraction
  const doneTexts = done.map((i) => i.output).filter(Boolean);
  const abandonedTexts = abandoned.map((i) => i.output).filter(Boolean);
  const stops = config.stop_words ?? DEFAULT_STOPS;
  const strong = topKeywords(doneTexts, 8, stops);
  const weak = topKeywords(abandonedTexts, 8, stops);

  // Style detection
  const signals = config.concrete_signals ?? DEFAULT_CONCRETE;
  let concrete = 0;
  let abstract = 0;
  for (const text of doneTexts) {
    const lower = text.toLowerCase();
    if (signals.some((s) => lower.includes(s))) concrete++;
    else abstract++;
  }

  // Time patterns
  const timestamps = window.map((i) => i.created_at);
  const activeHour = mostActiveHour(timestamps);
  const productiveHour = mostProductiveHour(window);

  // Fitness — weighted: 40% overall, 60% recent 10
  const recent = window.slice(0, 10);
  const recentRate = recent.length > 0
    ? recent.filter((i) => i.completed).length / recent.length
    : 0;
  const fitness = Math.min(1, Math.max(0, completionRate * 0.4 + recentRate * 0.6));

  return {
    user_id: userId,
    total_interactions: total,
    completed_interactions: done.length,
    completion_rate: Math.round(completionRate * 100) / 100,
    strong_topics: strong,
    weak_topics: weak,
    preferred_style: concrete >= abstract ? "concrete" : "abstract",
    avg_duration_seconds: avgDuration,
    active_hour: activeHour,
    productive_hour: productiveHour,
    fitness: Math.round(fitness * 100) / 100,
    version: (previousVersion ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
}
