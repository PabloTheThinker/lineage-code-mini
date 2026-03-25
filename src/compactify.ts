/**
 * COMPACTIFY — Experience Compression
 *
 * Inspired by Lineage Engine's compactification layer.
 * Raw interactions become statistical summaries that shape agent behavior.
 *
 * An agent that talked to a user 500 times doesn't replay 500 conversations.
 * It reads a profile: "This user prefers direct answers, engages most with
 * code topics, ignores long explanations, and is most responsive at 10am."
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
  "please", "thanks", "thank", "okay", "yes", "no", "hey", "hi",
]);

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

/** Find the hour with the highest acceptance rate (min 2 samples) */
export function mostProductiveHour(
  interactions: Pick<Interaction, "created_at" | "accepted">[]
): number | null {
  const total = new Array(24).fill(0);
  const accepted = new Array(24).fill(0);
  for (const i of interactions) {
    const h = new Date(i.created_at).getHours();
    if (isNaN(h)) continue;
    total[h]++;
    if (i.accepted) accepted[h]++;
  }
  let bestHour = -1;
  let bestRate = -1;
  for (let h = 0; h < 24; h++) {
    if (total[h] >= 2) {
      const rate = accepted[h] / total[h];
      if (rate > bestRate) { bestRate = rate; bestHour = h; }
    }
  }
  return bestHour >= 0 ? bestHour : null;
}

/** Detect preferred response style from accepted interactions */
function detectStyle(
  accepted: Interaction[],
  rejected: Interaction[]
): "direct" | "detailed" | "casual" | "formal" {
  // Measure average output length of accepted vs rejected
  const acceptedAvgLen = accepted.length > 0
    ? accepted.reduce((sum, i) => sum + i.output.length, 0) / accepted.length
    : 0;
  const rejectedAvgLen = rejected.length > 0
    ? rejected.reduce((sum, i) => sum + i.output.length, 0) / rejected.length
    : 0;

  // If accepted responses are significantly shorter than rejected ones,
  // user prefers direct/short answers
  const prefersShort = acceptedAvgLen > 0 && rejectedAvgLen > 0
    && acceptedAvgLen < rejectedAvgLen * 0.7;

  // Check for casual markers in accepted outputs
  const casualMarkers = ["hey", "haha", "lol", "yeah", "nah", "cool", "btw"];
  const formalMarkers = ["furthermore", "regarding", "pursuant", "accordingly"];

  let casualScore = 0;
  let formalScore = 0;
  for (const i of accepted) {
    const lower = i.output.toLowerCase();
    casualMarkers.forEach((m) => { if (lower.includes(m)) casualScore++; });
    formalMarkers.forEach((m) => { if (lower.includes(m)) formalScore++; });
  }

  if (prefersShort) return "direct";
  if (formalScore > casualScore) return "formal";
  if (casualScore > formalScore) return "casual";
  return "detailed";
}

/**
 * Compactify — compress raw interactions into a behavioral profile.
 *
 * Feed it the user's interaction history. Get back a profile
 * that tells the agent how to adapt to this specific user.
 */
export function compactify(
  userId: string,
  interactions: Interaction[],
  config: LineageConfig,
  previousVersion?: number
): UserProfile {
  // Normalize to chronological order so "recent" means newest by timestamp,
  // regardless of how the caller accumulated the interaction array.
  const sorted = [...interactions].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return aTime - bTime;
  });
  const window = sorted.slice(-config.consolidation_window);
  const total = window.length;
  const accepted = window.filter((i) => i.accepted);
  const rejected = window.filter((i) => !i.accepted);
  const acceptanceRate = total > 0 ? accepted.length / total : 0;

  // Engagement analysis
  const engagements = accepted
    .map((i) => i.engagement_seconds ?? 0)
    .filter((d) => d > 0);
  const avgEngagement = engagements.length > 0
    ? Math.round(engagements.reduce((a, b) => a + b, 0) / engagements.length)
    : 0;

  // Topic extraction
  const stops = config.stop_words ?? DEFAULT_STOPS;
  const acceptedTexts = accepted.map((i) => `${i.input} ${i.output}`);
  const rejectedTexts = rejected.map((i) => `${i.input} ${i.output}`);
  const strong = topKeywords(acceptedTexts, 8, stops);
  const weak = topKeywords(rejectedTexts, 8, stops);

  // Style detection
  const style = detectStyle(accepted, rejected);

  // Channel distribution
  const channels: Record<string, number> = {};
  for (const i of window) {
    const ch = i.channel || "unknown";
    channels[ch] = (channels[ch] || 0) + 1;
  }

  // Time patterns
  const timestamps = window.map((i) => i.created_at);
  const activeHour = mostActiveHour(timestamps);
  const productiveHour = mostProductiveHour(window);

  // Fitness — 40% overall, 60% recent 10
  const recent = window.slice(-10);
  const recentRate = recent.length > 0
    ? recent.filter((i) => i.accepted).length / recent.length
    : 0;
  const fitness = Math.min(1, Math.max(0, acceptanceRate * 0.4 + recentRate * 0.6));

  return {
    user_id: userId,
    total_interactions: total,
    accepted_interactions: accepted.length,
    acceptance_rate: Math.round(acceptanceRate * 100) / 100,
    strong_topics: strong,
    weak_topics: weak,
    preferred_style: style,
    avg_engagement_seconds: avgEngagement,
    active_hour: activeHour,
    productive_hour: productiveHour,
    channel_distribution: channels,
    fitness: Math.round(fitness * 100) / 100,
    version: (previousVersion ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
}
