/**
 * Lineage Code Mini
 *
 * Lightweight cognitive personalization engine.
 * Three concepts from the Lineage Engine, distilled for any app:
 *
 * 1. COMPACTIFY — compress interaction history into statistical profiles
 * 2. PATTERNS — cognitive frames that shape AI behavior per user
 * 3. WARMTH — ambient UI signals derived from user behavior
 *
 * Framework-agnostic. No runtime dependencies. Works in serverless.
 *
 * Usage:
 *   import { compactify, personalize, computeWarmth } from 'lineage-code-mini'
 *
 * A Vektra Technologies project.
 * "I shall not fall. No more."
 */

// Core types
export type {
  Interaction,
  UserProfile,
  CognitivePattern,
  LineageConfig,
} from "./types.js";

// Compactification — experience → profile
export {
  compactify,
  extractKeywords,
  topKeywords,
  mostActiveHour,
  mostProductiveHour,
} from "./compactify.js";

// Cognitive patterns — profile → AI instructions
export {
  BUILTIN_PATTERNS,
  route,
  personalize,
} from "./patterns.js";

// Ambient warmth — profile → UI signals
export type { WarmthColors } from "./warmth.js";
export {
  computeWarmth,
  getGreeting,
  getMomentum,
} from "./warmth.js";

// ── Convenience: default config ──

import type { LineageConfig } from "./types.js";

export const DEFAULT_CONFIG: LineageConfig = {
  min_interactions: 3,
  consolidation_window: 100,
  fitness_alarm: 0.35,
};
