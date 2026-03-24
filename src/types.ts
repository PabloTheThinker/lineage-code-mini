/**
 * Lineage Code Mini — Core Types
 *
 * Behavioral adaptation layer for AI agents.
 * Framework-agnostic. Works with OpenClaw, custom agents, or any LLM wrapper.
 * No runtime dependencies.
 */

/** A single recorded interaction between user and agent */
export interface Interaction {
  id: string;
  /** What the user said/sent */
  input: string;
  /** What the agent responded with */
  output: string;
  /** Agent's reasoning for why it responded this way */
  reasoning?: string;
  /** Did the user accept/act on this response? */
  accepted: boolean;
  /** How long the user engaged with the response (seconds, optional) */
  engagement_seconds?: number;
  /** When this interaction happened */
  created_at: string;
  /** Freeform tags for categorization */
  tags?: string[];
  /** Which channel this came from (telegram, discord, web, etc.) */
  channel?: string;
}

/** Compactified user profile — how this specific user interacts with the agent */
export interface UserProfile {
  user_id: string;
  total_interactions: number;
  accepted_interactions: number;
  acceptance_rate: number;

  /** Topics the user engages with most */
  strong_topics: string[];
  /** Topics the user ignores or rejects */
  weak_topics: string[];

  /** How the user prefers the agent to respond */
  preferred_style: "direct" | "detailed" | "casual" | "formal";

  /** Average engagement duration in seconds */
  avg_engagement_seconds: number;

  /** Most active hour (0-23) */
  active_hour: number | null;
  /** Hour with highest acceptance rate */
  productive_hour: number | null;

  /** Per-channel interaction counts */
  channel_distribution: Record<string, number>;

  /** 0-1 score — how well the agent is serving this user */
  fitness: number;

  /** Incremented each time the profile is reconsolidated */
  version: number;

  updated_at: string;
}

/** A cognitive pattern — a behavioral frame the agent can use */
export interface CognitivePattern {
  name: string;
  description: string;
  /** When should this pattern activate? */
  condition: (profile: UserProfile) => boolean;
  /** What instruction does the agent get? */
  hint: (profile: UserProfile) => string;
  /** Higher priority wins when multiple patterns match */
  priority: number;
}

/** Configuration for the engine */
export interface LineageConfig {
  /** Minimum interactions before personalization kicks in */
  min_interactions: number;
  /** Max interactions to analyze during consolidation */
  consolidation_window: number;
  /** Fitness threshold below which patterns self-correct */
  fitness_alarm: number;
  /** Stop words to exclude from keyword extraction */
  stop_words?: Set<string>;
}

/** Agent adaptation context — injected into the agent's system prompt */
export interface AdaptationContext {
  /** The personalized system prompt */
  prompt: string;
  /** Active pattern names for logging/debugging */
  active_patterns: string[];
  /** Current fitness score */
  fitness: number;
  /** Whether personalization is active (enough data) */
  personalized: boolean;
}
