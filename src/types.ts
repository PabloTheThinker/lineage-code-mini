/**
 * Lineage Code Mini — Core Types
 *
 * Framework-agnostic. No runtime dependencies.
 * These types define the shape of a user's cognitive profile.
 */

/** A single recorded interaction: input → AI output → user response */
export interface Interaction {
  id: string;
  input: string;
  output: string;
  reasoning?: string;
  completed: boolean;
  duration_seconds?: number;
  created_at: string;
  tags?: string[];
}

/** Compactified user profile — statistical summary of all interactions */
export interface UserProfile {
  user_id: string;
  total_interactions: number;
  completed_interactions: number;
  completion_rate: number;

  /** Keywords that appear in completed interactions */
  strong_topics: string[];
  /** Keywords that appear in abandoned interactions */
  weak_topics: string[];

  /** Preferred output style: 'concrete' | 'abstract' */
  preferred_style: "concrete" | "abstract";

  /** Average interaction duration in seconds */
  avg_duration_seconds: number;

  /** Most active hour (0-23) */
  active_hour: number | null;
  /** Hour with highest completion rate */
  productive_hour: number | null;

  /** 0-1 score of how well current patterns are working */
  fitness: number;

  /** Incremented each time the profile is reconsolidated */
  version: number;

  updated_at: string;
}

/** A cognitive pattern — a reasoning frame the AI can use */
export interface CognitivePattern {
  name: string;
  description: string;
  condition: (profile: UserProfile) => boolean;
  hint: (profile: UserProfile) => string;
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
  /** Signals for concrete task style detection */
  concrete_signals?: string[];
}
