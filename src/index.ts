/**
 * Lineage Code Mini
 *
 * Behavioral adaptation layer for AI agents.
 * Three concepts from the Lineage Engine, distilled for any agent:
 *
 * 1. COMPACTIFY — compress interaction history into user profiles
 * 2. PATTERNS — cognitive frames that shape agent behavior per user
 * 3. AGENT — integration helpers for OpenClaw, custom agents, raw LLM calls
 *
 * Framework-agnostic. Zero runtime dependencies. Works in serverless.
 *
 * Quick start:
 *   import { pipeline } from 'lineage-code-mini'
 *   const { context, profile } = pipeline(userId, interactions, basePrompt)
 *   // context.prompt is your adapted system message
 *
 * OpenClaw integration:
 *   import { asSoulPatch } from 'lineage-code-mini'
 *   const patch = asSoulPatch(profile)
 *   // Append to SOUL.md or USER.md
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
  AdaptationContext,
} from "./types.js";

// Compactification — interactions → profile
export {
  compactify,
  extractKeywords,
  topKeywords,
  mostActiveHour,
  mostProductiveHour,
} from "./compactify.js";

// Cognitive patterns — profile → agent instructions
export {
  BUILTIN_PATTERNS,
  route,
  adapt,
  personalize,
} from "./patterns.js";

// Agent integration — pipeline, OpenClaw helpers
export {
  DEFAULT_CONFIG,
  pipeline,
  asSoulPatch,
  asSkillContext,
  recordInteraction,
} from "./agent.js";
