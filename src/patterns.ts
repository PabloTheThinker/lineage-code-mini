/**
 * PATTERNS — Cognitive Pattern Router
 *
 * Inspired by Lineage Engine's CognitivePattern system.
 * Each pattern is a behavioral frame that activates based on the user's profile.
 * The agent adapts HOW it responds — not just WHAT it says.
 *
 * Patterns shape:
 * - Response length and density
 * - Tone and formality
 * - Topic selection when multiple options exist
 * - Self-correction when fitness drops
 *
 * "The mind doesn't think the same way about every problem.
 *  It selects the right cognitive frame first."
 */

import type { CognitivePattern, UserProfile, AdaptationContext } from "./types.js";

/** Built-in patterns — the default behavioral frames */
export const BUILTIN_PATTERNS: CognitivePattern[] = [
  // ── Style Patterns ──
  {
    name: "style_direct",
    description: "User prefers short, direct responses",
    condition: (p) => p.preferred_style === "direct",
    hint: () =>
      "This user prefers SHORT, DIRECT responses. Lead with the answer. Skip preamble. If you can say it in one sentence, don't use three.",
    priority: 7,
  },
  {
    name: "style_detailed",
    description: "User engages more with thorough explanations",
    condition: (p) => p.preferred_style === "detailed",
    hint: () =>
      "This user engages more with thorough, well-structured responses. Include reasoning, examples, and context. Don't oversimplify.",
    priority: 7,
  },
  {
    name: "style_casual",
    description: "User responds to casual, conversational tone",
    condition: (p) => p.preferred_style === "casual",
    hint: () =>
      "This user responds well to casual, conversational tone. Be natural. Contractions are fine. Think out loud.",
    priority: 7,
  },
  {
    name: "style_formal",
    description: "User expects formal, structured communication",
    condition: (p) => p.preferred_style === "formal",
    hint: () =>
      "This user expects formal, well-structured responses. Use precise language. Organize clearly. Maintain professional register.",
    priority: 7,
  },

  // ── Engagement Patterns ──
  {
    name: "low_acceptance",
    description: "Agent's responses aren't landing — go simpler",
    condition: (p) => p.acceptance_rate < 0.3 && p.total_interactions >= 5,
    hint: () =>
      "This user frequently ignores or rejects responses. Keep it SIMPLE. Ask clarifying questions before giving long answers. Match their energy — if they send short messages, respond short.",
    priority: 9,
  },
  {
    name: "high_acceptance",
    description: "Strong rapport — agent can be more expressive",
    condition: (p) => p.acceptance_rate > 0.7 && p.total_interactions >= 5,
    hint: () =>
      "This user has strong engagement. You can be more expressive, share insights proactively, and offer suggestions they didn't ask for. Trust is established.",
    priority: 4,
  },

  // ── Topic Patterns ──
  {
    name: "strong_topics",
    description: "Lean toward topics the user engages with",
    condition: (p) => p.strong_topics.length > 0,
    hint: (p) =>
      `Topics this user engages with most: ${p.strong_topics.join(", ")}. When relevant, lean into these areas — they're more likely to find value here.`,
    priority: 3,
  },
  {
    name: "weak_topics",
    description: "Be careful with topics the user ignores",
    condition: (p) => p.weak_topics.length > 0,
    hint: (p) =>
      `Topics this user tends to ignore: ${p.weak_topics.join(", ")}. Don't lead with these unless directly asked. Reframe if needed.`,
    priority: 3,
  },

  // ── Time Patterns ──
  {
    name: "productive_hour",
    description: "User is in their most engaged time window",
    condition: (p) => {
      if (p.productive_hour === null) return false;
      const hour = new Date().getHours();
      return Math.abs(hour - p.productive_hour) <= 1;
    },
    hint: () =>
      "This is the user's most engaged time window. They're receptive now — this is the time for substantive responses, not small talk.",
    priority: 2,
  },
  {
    name: "off_hours",
    description: "User is outside their typical active hours",
    condition: (p) => {
      if (p.active_hour === null) return false;
      const hour = new Date().getHours();
      return Math.abs(hour - p.active_hour) > 6;
    },
    hint: () =>
      "This user is outside their usual active hours. Keep responses lighter and shorter — they may not have full attention right now.",
    priority: 2,
  },

  // ── Fitness Alarm ──
  {
    name: "fitness_alarm",
    description: "Agent is underperforming — self-correct",
    condition: (p) => p.fitness < 0.35 && p.total_interactions >= 5,
    hint: () =>
      "CRITICAL: Recent responses have not been well-received. Change your approach. Try shorter responses, ask more questions, or match the user's communication style more closely. What you've been doing isn't working.",
    priority: 10,
  },
];

/**
 * Route — select matching patterns for a user profile.
 * Returns hint strings sorted by priority (highest first).
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
 * Adapt — build a full adaptation context for an agent.
 *
 * Takes a base system prompt and a user profile.
 * Returns the personalized prompt + metadata.
 *
 * This is the main entry point for agent integration.
 *
 * @example
 * ```ts
 * const ctx = adapt(agent.systemPrompt, userProfile);
 * // Use ctx.prompt as the system message for your LLM call
 * // Log ctx.active_patterns for debugging
 * // Monitor ctx.fitness for self-correction
 * ```
 */
export function adapt(
  basePrompt: string,
  profile: UserProfile | null,
  minInteractions = 3,
  extraPatterns?: CognitivePattern[]
): AdaptationContext {
  if (!profile || profile.total_interactions < minInteractions) {
    return {
      prompt: basePrompt,
      active_patterns: [],
      fitness: 0.5,
      personalized: false,
    };
  }

  const allPatterns = [...BUILTIN_PATTERNS, ...(extraPatterns ?? [])];
  const matched = allPatterns
    .filter((p) => p.condition(profile))
    .sort((a, b) => b.priority - a.priority);

  const hints = matched.map((p) => p.hint(profile));
  const names = matched.map((p) => p.name);

  if (hints.length === 0) {
    return {
      prompt: basePrompt,
      active_patterns: [],
      fitness: profile.fitness,
      personalized: false,
    };
  }

  const block = hints.map((h) => `- ${h}`).join("\n");

  const prompt = `${basePrompt}

BEHAVIORAL ADAPTATION (learned from ${profile.total_interactions} interactions with this user, ${Math.round(profile.acceptance_rate * 100)}% acceptance rate):
${block}`;

  return {
    prompt,
    active_patterns: names,
    fitness: profile.fitness,
    personalized: true,
  };
}

/** Convenience alias for adapt() — same function, clearer name for prompt-building */
export const personalize = adapt;
