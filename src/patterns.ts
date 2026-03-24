/**
 * PATTERNS — Cognitive Pattern Router
 *
 * Inspired by Lineage Engine's CognitivePattern system.
 * Each pattern is a reasoning frame that activates based on the user's profile.
 * The AI doesn't think the same way about every user — it selects the right frame first.
 *
 * Patterns have:
 * - A condition: when does this pattern activate?
 * - A hint: what instruction does the AI get?
 * - A priority: higher wins when multiple patterns match
 *
 * "The mind doesn't think the same way about every problem.
 *  It selects the right cognitive frame first."
 */

import type { CognitivePattern, UserProfile } from "./types.js";

/** Built-in patterns — the default cognitive frames */
export const BUILTIN_PATTERNS: CognitivePattern[] = [
  {
    name: "concrete_preference",
    description: "User completes concrete, specific tasks more than abstract ones",
    condition: (p) => p.preferred_style === "concrete" && p.total_interactions >= 3,
    hint: (p) =>
      `This person completes tasks more when they're concrete and specific (e.g. "Write the email to Sarah" not "Handle communications"). Their completion rate is ${Math.round(p.completion_rate * 100)}%.`,
    priority: 5,
  },
  {
    name: "abstract_preference",
    description: "User responds better to higher-level framing",
    condition: (p) => p.preferred_style === "abstract" && p.total_interactions >= 3,
    hint: () =>
      "This person responds better to higher-level framing (e.g. \"Address the most urgent blocker\" rather than hyper-specific steps).",
    priority: 5,
  },
  {
    name: "low_completion",
    description: "User has low completion rate — needs smaller actions",
    condition: (p) => p.completion_rate < 0.3 && p.total_interactions >= 5,
    hint: () =>
      "Their completion rate is low. Pick the SMALLEST possible action — something they can finish in one sitting. Momentum matters more than ambition right now.",
    priority: 8,
  },
  {
    name: "high_completion",
    description: "User has strong follow-through — can handle bigger tasks",
    condition: (p) => p.completion_rate > 0.7 && p.total_interactions >= 5,
    hint: () =>
      "They have strong follow-through. You can suggest meaningful, challenging tasks — they'll finish them.",
    priority: 4,
  },
  {
    name: "strong_topics",
    description: "Lean toward topics the user tends to complete",
    condition: (p) => p.strong_topics.length > 0,
    hint: (p) =>
      `Topics they tend to complete: ${p.strong_topics.join(", ")}. Lean toward these when multiple tasks compete.`,
    priority: 3,
  },
  {
    name: "weak_topics",
    description: "Avoid framing around topics the user tends to abandon",
    condition: (p) => p.weak_topics.length > 0,
    hint: (p) =>
      `Topics they tend to abandon: ${p.weak_topics.join(", ")}. Avoid framing tasks around these unless truly urgent.`,
    priority: 3,
  },
  {
    name: "duration_fit",
    description: "Size the task to fit the user's preferred duration",
    condition: (p) => p.avg_duration_seconds > 0,
    hint: (p) =>
      `They usually focus for ${Math.round(p.avg_duration_seconds / 60)} minutes. Size the task to fit that window.`,
    priority: 2,
  },
  {
    name: "fitness_alarm",
    description: "Recent suggestions haven't been working — try a different approach",
    condition: (p) => p.fitness < 0.35 && p.total_interactions >= 5,
    hint: () =>
      "IMPORTANT: Recent suggestions haven't been working well. Try a different approach — simpler, more concrete, or differently framed than what you'd normally suggest.",
    priority: 10,
  },
];

/**
 * Route — select and apply matching patterns for a user profile.
 *
 * Returns an array of hint strings, sorted by priority (highest first).
 * These get injected into the AI's system prompt.
 */
export function route(
  profile: UserProfile,
  extraPatterns?: CognitivePattern[]
): string[] {
  const allPatterns = [...BUILTIN_PATTERNS, ...(extraPatterns ?? [])];

  return allPatterns
    .filter((p) => p.condition(profile))
    .sort((a, b) => b.priority - a.priority)
    .map((p) => p.hint(profile));
}

/**
 * Build a personalized system prompt by injecting pattern hints.
 *
 * @param basePrompt - The AI's base system prompt
 * @param profile - The user's compactified profile (or null for new users)
 * @param minInteractions - Minimum interactions before personalization activates
 * @param extraPatterns - Additional cognitive patterns to consider
 */
export function personalize(
  basePrompt: string,
  profile: UserProfile | null,
  minInteractions = 3,
  extraPatterns?: CognitivePattern[]
): string {
  if (!profile || profile.total_interactions < minInteractions) {
    return basePrompt;
  }

  const hints = route(profile, extraPatterns);

  if (hints.length === 0) return basePrompt;

  const block = hints.map((h) => `- ${h}`).join("\n");

  return `${basePrompt}

PERSONALIZATION (learned from this user's ${profile.total_interactions} past interactions, ${Math.round(profile.completion_rate * 100)}% completion rate):
${block}`;
}
