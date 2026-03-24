/**
 * WARMTH — Ambient Personalization
 *
 * Subtle UI signals derived from the user's profile.
 * Nobody notices consciously. Everyone feels it.
 *
 * - Color warmth: accent shifts from cool → warm as completion improves
 * - Time-aware greetings: reads the room before the user types
 * - Momentum: quiet acknowledgment after completions
 */

import type { UserProfile } from "./types.js";

/** CSS custom property overrides for color warmth shift */
export interface WarmthColors {
  accent: string;
  accentGlow: string;
  ring: string;
}

/**
 * Compute color warmth from completion rate.
 * Returns null for new users (no shift).
 *
 * Hue shifts from cool teal (174) toward warm teal-gold (160).
 * Saturation increases slightly. The shift is subtle — the user
 * never notices the color changed. They just feel the app is "warmer."
 */
export function computeWarmth(profile: UserProfile | null, minInteractions = 3): WarmthColors | null {
  if (!profile || profile.total_interactions < minInteractions) return null;

  const rate = Math.min(1, Math.max(0, profile.completion_rate));
  const hue = Math.round(174 - rate * 14);
  const sat = Math.round(84 + rate * 8);

  return {
    accent: `hsl(${hue}, ${sat}%, 64%)`,
    accentGlow: `hsla(${hue}, ${sat}%, 64%, 0.12)`,
    ring: `hsla(${hue}, ${sat}%, 64%, 0.25)`,
  };
}

/**
 * Time-aware greeting based on user's patterns and current hour.
 * Returns null if nothing meaningful to say.
 */
export function getGreeting(profile: UserProfile | null, minInteractions = 3): string | null {
  if (!profile || profile.total_interactions < minInteractions) return null;

  const hour = new Date().getHours();

  // Best hour nudge
  if (profile.productive_hour !== null) {
    const diff = Math.abs(hour - profile.productive_hour);
    if (diff <= 1) return "This is your best hour.";
  }

  // Time-of-day awareness
  if (hour >= 22 || hour < 5) {
    return profile.completion_rate < 0.4
      ? "Keep it small tonight."
      : "Late session. One thing, then rest.";
  }
  if (hour >= 5 && hour < 9) return "Morning mind. Fresh start.";
  if (hour >= 12 && hour < 14) return "Afternoon reset.";

  return null;
}

/**
 * Completion momentum — quiet encouragement after sessions.
 * Not streaks. Not gamification. Just acknowledgment.
 */
export function getMomentum(todayCompleted: number): string | null {
  if (todayCompleted <= 0) return null;
  if (todayCompleted === 1) return "First one down.";
  if (todayCompleted === 2) return "Two in a row.";
  if (todayCompleted === 3) return "Three. You're locked in.";
  if (todayCompleted >= 4) return `${todayCompleted} sessions today. Sharp.`;
  return null;
}
