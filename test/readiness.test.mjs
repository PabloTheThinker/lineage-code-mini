import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { compactify, pipeline, DEFAULT_CONFIG } from "lineage-code-mini";

const require = createRequire(import.meta.url);

test("package exports load through ESM self-import", () => {
  assert.equal(typeof compactify, "function");
  assert.equal(typeof pipeline, "function");
  assert.equal(DEFAULT_CONFIG.min_interactions, 3);
});

test("package exports load through CommonJS require", () => {
  const pkg = require("lineage-code-mini");
  assert.equal(typeof pkg.compactify, "function");
  assert.equal(typeof pkg.pipeline, "function");
});

test("compactify uses the latest interactions by timestamp", () => {
  const interactions = [
    {
      id: "1",
      input: "old deploy question",
      output: "old helpful answer",
      accepted: true,
      created_at: "2026-01-01T10:00:00.000Z",
    },
    {
      id: "2",
      input: "older architecture question",
      output: "older helpful answer",
      accepted: true,
      created_at: "2026-01-02T10:00:00.000Z",
    },
    {
      id: "5",
      input: "latest topic ignored",
      output: "latest answer ignored",
      accepted: false,
      created_at: "2026-01-05T10:00:00.000Z",
    },
    {
      id: "4",
      input: "newer topic ignored",
      output: "newer answer ignored",
      accepted: false,
      created_at: "2026-01-04T10:00:00.000Z",
    },
  ];

  const profile = compactify("u1", interactions, {
    ...DEFAULT_CONFIG,
    consolidation_window: 2,
  });

  assert.equal(profile.total_interactions, 2);
  assert.equal(profile.accepted_interactions, 0);
  assert.equal(profile.acceptance_rate, 0);
  assert.equal(profile.fitness, 0);
  assert.ok(profile.weak_topics.includes("latest") || profile.weak_topics.includes("newer"));
});

test("compactify classifies consistently short accepted outputs as direct", () => {
  const profile = compactify("u3", [
    {
      id: "1",
      input: "deploy?",
      output: "Run npm publish.",
      accepted: true,
      created_at: "2026-01-01T10:00:00.000Z",
    },
    {
      id: "2",
      input: "shorter",
      output: "Done.",
      accepted: true,
      created_at: "2026-01-02T10:00:00.000Z",
    },
    {
      id: "3",
      input: "thanks",
      output: "Welcome.",
      accepted: true,
      created_at: "2026-01-03T10:00:00.000Z",
    },
  ], DEFAULT_CONFIG);

  assert.equal(profile.preferred_style, "direct");
});
