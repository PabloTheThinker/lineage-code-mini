/**
 * AGENT — Integration Helpers
 *
 * Convenience functions for wiring Lineage Code Mini into any AI agent.
 * Works with OpenClaw, custom agents, or raw LLM API calls.
 *
 * The agent doesn't need to know about profiles or patterns.
 * It just calls adapt() before each response and gets back an adapted prompt.
 *
 * For OpenClaw specifically:
 * - Use asSkillContext() to inject into a SOUL.md or skill
 * - Use asSoulPatch() to generate a SOUL.md section
 *
 * "An agent that doesn't learn from its user isn't an agent.
 *  It's a parrot with an API key."
 */

import type { Interaction, UserProfile, LineageConfig, AdaptationContext } from "./types.js";
import { compactify } from "./compactify.js";
import { adapt } from "./patterns.js";

export const DEFAULT_CONFIG: LineageConfig = {
  min_interactions: 3,
  consolidation_window: 100,
  fitness_alarm: 0.35,
};

/**
 * Full pipeline: interactions → profile → adapted prompt.
 *
 * One function call. Give it the user's history and the agent's base prompt.
 * Get back a prompt that's adapted to this specific user.
 */
export function pipeline(
  userId: string,
  interactions: Interaction[],
  basePrompt: string,
  config?: Partial<LineageConfig>
): { context: AdaptationContext; profile: UserProfile } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const profile = compactify(userId, interactions, cfg);
  const context = adapt(basePrompt, profile, cfg.min_interactions);
  return { context, profile };
}

/**
 * Generate a SOUL.md section for OpenClaw agents.
 *
 * Produces markdown that can be appended to an agent's SOUL.md
 * or USER.md file to inject behavioral adaptation.
 */
export function asSoulPatch(profile: UserProfile): string {
  if (profile.total_interactions < 3) return "";

  const lines: string[] = [
    "## Behavioral Adaptation (Lineage Code Mini)",
    "",
    `Based on ${profile.total_interactions} interactions (${Math.round(profile.acceptance_rate * 100)}% acceptance).`,
    "",
  ];

  // Style
  const styleMap: Record<string, string> = {
    direct: "Keep responses SHORT and DIRECT. Lead with the answer.",
    detailed: "Give thorough, well-structured responses with context.",
    casual: "Use conversational tone. Natural, not robotic.",
    formal: "Maintain formal, precise language.",
  };
  lines.push(`**Response style:** ${styleMap[profile.preferred_style]}`);

  // Topics
  if (profile.strong_topics.length > 0) {
    lines.push(`**Engages with:** ${profile.strong_topics.join(", ")}`);
  }
  if (profile.weak_topics.length > 0) {
    lines.push(`**Ignores:** ${profile.weak_topics.join(", ")}`);
  }

  // Fitness
  if (profile.fitness < 0.35) {
    lines.push("");
    lines.push("**⚠ Fitness alarm:** Recent responses aren't landing. Change approach.");
  }

  return lines.join("\n");
}

/**
 * Generate a context block for OpenClaw skill injection.
 *
 * Returns a plain object that can be serialized into a skill's
 * runtime context or injected as a tool result.
 */
export function asSkillContext(profile: UserProfile): Record<string, unknown> {
  return {
    lineage_version: "mini",
    user_id: profile.user_id,
    interactions: profile.total_interactions,
    acceptance_rate: profile.acceptance_rate,
    preferred_style: profile.preferred_style,
    strong_topics: profile.strong_topics,
    weak_topics: profile.weak_topics,
    fitness: profile.fitness,
    active_hour: profile.active_hour,
    productive_hour: profile.productive_hour,
    channels: profile.channel_distribution,
  };
}

/**
 * Create a feedback signal from the user's response to the agent.
 *
 * Call this after each interaction to build the history that
 * feeds back into compactify().
 *
 * @param accepted - Did the user engage positively? (replied, acted, thumbs up)
 */
export function recordInteraction(
  id: string,
  input: string,
  output: string,
  accepted: boolean,
  options?: {
    reasoning?: string;
    engagement_seconds?: number;
    channel?: string;
    tags?: string[];
  }
): Interaction {
  return {
    id,
    input,
    output,
    accepted,
    reasoning: options?.reasoning,
    engagement_seconds: options?.engagement_seconds,
    channel: options?.channel,
    tags: options?.tags,
    created_at: new Date().toISOString(),
  };
}
