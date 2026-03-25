# Lineage Code Mini

Behavioral adaptation layer for AI agents. Your agent learns how each user likes to be talked to.

Without it, every conversation starts cold — same tone, same length, same assumptions. With it, the agent adapts: response style, topic selection, timing awareness, and self-correction when its approach stops working.

Three concepts from the [Lineage Engine](https://github.com/PabloTheThinker), distilled into a zero-dependency TypeScript library that works anywhere.

## Install

```bash
npm install lineage-code-mini
```

ESM:

```js
import { pipeline } from 'lineage-code-mini'
```

CommonJS:

```js
const { pipeline } = require('lineage-code-mini')
```

## Quick Start

```typescript
import { pipeline } from 'lineage-code-mini'

// Feed it the user's interaction history + your agent's base prompt
const { context, profile } = pipeline(userId, interactions, basePrompt)

// context.prompt is your adapted system message — use it with any LLM
const response = await llm.chat({ system: context.prompt, user: message })

// context.active_patterns tells you which behavioral frames activated
// context.fitness tells you how well your agent is serving this user
```

## How It Works

### 1. Compactify

Compresses interaction history into a statistical profile. 500 conversations become 8 signals.

```typescript
import { compactify, DEFAULT_CONFIG } from 'lineage-code-mini'

const profile = compactify(userId, interactions, DEFAULT_CONFIG)

// profile.acceptance_rate    → 0.74
// profile.preferred_style    → "direct"
// profile.strong_topics      → ["code", "deploy", "architecture"]
// profile.weak_topics        → ["small-talk", "planning"]
// profile.productive_hour    → 10
// profile.fitness            → 0.68
```

The agent doesn't replay history. It reads a profile: *"This user prefers direct answers, engages most with code topics, ignores long explanations, and is most responsive at 10am."*

### 2. Patterns

11 built-in cognitive frames that activate based on the user's profile. Each one injects a behavioral hint into the agent's system prompt.

| Pattern | Activates When | What It Does |
|---|---|---|
| `style_direct` | User prefers short responses | "Lead with the answer. Skip preamble." |
| `style_detailed` | User engages with depth | "Include reasoning, examples, context." |
| `style_casual` | User responds to casual tone | "Be natural. Contractions are fine." |
| `style_formal` | User expects structure | "Maintain formal, precise language." |
| `low_acceptance` | <30% acceptance rate | "Keep it SIMPLE. Ask before explaining." |
| `high_acceptance` | >70% acceptance rate | "Trust is established. Be more expressive." |
| `strong_topics` | Known engagement topics | Lean toward topics user engages with |
| `weak_topics` | Known ignored topics | Avoid leading with these |
| `productive_hour` | User's best time of day | "They're receptive now. Go substantive." |
| `off_hours` | Outside active hours | "Keep it lighter and shorter." |
| `fitness_alarm` | Fitness < 0.35 | "Change your approach. This isn't working." |

Add custom patterns:

```typescript
import { adapt } from 'lineage-code-mini'
import type { CognitivePattern } from 'lineage-code-mini'

const devMode: CognitivePattern = {
  name: "developer_user",
  description: "User is a developer — use code examples",
  condition: (p) => p.strong_topics.includes("code"),
  hint: () => "This user is technical. Use code examples instead of prose when possible.",
  priority: 6,
}

const context = adapt(basePrompt, profile, 3, [devMode])
```

### 3. Adapt

Takes the agent's base prompt and the user's profile. Returns an adapted prompt with the right behavioral frames injected.

```typescript
import { adapt } from 'lineage-code-mini'

const context = adapt(basePrompt, profile)

// context.prompt includes:
// BEHAVIORAL ADAPTATION (learned from 47 interactions, 74% acceptance rate):
// - This user prefers SHORT, DIRECT responses. Lead with the answer.
// - Topics they engage with most: code, deploy, architecture.
// - Topics they tend to ignore: small-talk, planning.
// - They usually engage for 12 minutes. Size responses accordingly.
```

## OpenClaw Integration

Generate a section for your agent's `SOUL.md` or `USER.md`:

```typescript
import { asSoulPatch } from 'lineage-code-mini'

const patch = asSoulPatch(profile)
// Append to SOUL.md or USER.md
```

Output:

```markdown
## Behavioral Adaptation (Lineage Code Mini)

Based on 47 interactions (74% acceptance).

**Response style:** Keep responses SHORT and DIRECT. Lead with the answer.
**Engages with:** code, deploy, architecture, review
**Ignores:** small-talk, planning, weather
```

Inject into a skill's runtime context:

```typescript
import { asSkillContext } from 'lineage-code-mini'

const ctx = asSkillContext(profile)
// Returns a serializable object for skill injection
```

## Recording Interactions

Build interaction objects to feed back into `compactify()`:

```typescript
import { recordInteraction } from 'lineage-code-mini'

const interaction = recordInteraction(
  "msg-123",           // id
  "how do I deploy?",  // user input
  "Run: git push",     // agent output
  true,                // accepted (user engaged positively)
  {
    channel: "telegram",
    engagement_seconds: 45,
    tags: ["deploy", "help"],
  }
)

// Store these, then pass the array to compactify()
```

## Fitness Score

The fitness score (0–1) tracks how well the agent is serving each user. It's a weighted blend of overall acceptance rate (40%) and the last 10 interactions (60%).

When fitness drops below 0.35, the `fitness_alarm` pattern fires and injects: *"CRITICAL: Recent responses have not been well-received. Change your approach."*

The agent self-corrects without anyone intervening.

## API Reference

### Core Functions

| Function | Input | Output |
|---|---|---|
| `compactify(userId, interactions, config)` | Raw history | `UserProfile` |
| `adapt(basePrompt, profile, minInteractions?, extraPatterns?)` | Prompt + profile | `AdaptationContext` |
| `pipeline(userId, interactions, basePrompt, config?)` | Everything at once | `{ context, profile }` |
| `route(profile, extraPatterns?)` | Profile | `string[]` (hints) |

### OpenClaw Helpers

| Function | Input | Output |
|---|---|---|
| `asSoulPatch(profile)` | Profile | Markdown for SOUL.md |
| `asSkillContext(profile)` | Profile | Serializable context object |
| `recordInteraction(id, input, output, accepted, options?)` | Event data | `Interaction` |

### Configuration

```typescript
import { DEFAULT_CONFIG } from 'lineage-code-mini'

// DEFAULT_CONFIG:
// {
//   min_interactions: 3,        // personalization starts after 3 interactions
//   consolidation_window: 100,  // analyze last 100 interactions
//   fitness_alarm: 0.35,        // self-correct below this threshold
// }
```

## Design Principles

- **Zero dependencies.** Pure TypeScript. Works in Node, Deno, Bun, browsers, serverless.
- **Framework-agnostic.** Not tied to any LLM provider, agent framework, or database.
- **Privacy-first.** Profiles are computed locally. No data leaves your system.
- **Invisible to users.** They don't configure anything. They just notice the agent gets better.

## License

MIT — [Vektra Technologies](https://vektratechnologies.com)
