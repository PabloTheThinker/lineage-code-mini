---
name: lineage-mini
description: "Behavioral adaptation for AI agents. Learns how each user prefers to be talked to — response style, topics, timing, self-correction. Use this skill when you want your agent to adapt its responses based on conversation history. Triggers on: /lineage, /adapt, /profile, or when the agent needs to personalize responses."
user-invocable: true
metadata: {"openclaw": {"emoji": "🧬", "requires": {"bins": ["node"]}}}
---

# Lineage Code Mini — Behavioral Adaptation Skill

You have access to `lineage-code-mini`, a behavioral adaptation engine. It learns how each user likes to be talked to and adapts your responses accordingly.

## How It Works

1. **Record** — after each conversation, record whether the user engaged positively
2. **Compactify** — compress interaction history into a behavioral profile
3. **Adapt** — inject the profile into your system prompt before responding

## Commands

### `/lineage` or `/profile` — View a user's behavioral profile

Run the adaptation pipeline on the current user's conversation history:

```bash
node -e "
const { compactify, DEFAULT_CONFIG } = require('lineage-code-mini');
const fs = require('fs');
const historyPath = '{baseDir}/data/interactions.json';
const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : [];
const profile = compactify('current-user', history, DEFAULT_CONFIG);
console.log(JSON.stringify(profile, null, 2));
"
```

### `/adapt` — Generate behavioral hints for the current user

```bash
node -e "
const { pipeline } = require('lineage-code-mini');
const fs = require('fs');
const historyPath = '{baseDir}/data/interactions.json';
const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : [];
const basePrompt = 'You are a helpful AI assistant.';
const { context, profile } = pipeline('current-user', history, basePrompt);
console.log('Active patterns:', context.active_patterns);
console.log('Fitness:', context.fitness);
console.log('Personalized:', context.personalized);
console.log('---');
console.log(context.prompt);
"
```

## Automatic Adaptation

When this skill is loaded, you should:

1. **Before each response**, check if a user profile exists at `{baseDir}/data/profiles/`. If it does, read it and apply the behavioral hints to your response style.

2. **After each conversation turn**, record the interaction:
   - Was the user's response positive/engaged? (replied, followed up, said thanks, acted on suggestion) → `accepted: true`
   - Was it negative/disengaged? (ignored, changed topic, expressed frustration, no reply) → `accepted: false`

3. **Every 10 interactions**, run compactification to update the profile.

## Profile Fields

| Field | What it means |
|---|---|
| `preferred_style` | "direct" / "detailed" / "casual" / "formal" — how to frame responses |
| `strong_topics` | Topics user engages with — lean into these |
| `weak_topics` | Topics user ignores — avoid leading with these |
| `acceptance_rate` | 0-1 — how often your responses land |
| `fitness` | 0-1 — how well you're serving this user. Below 0.35 = change approach |
| `productive_hour` | Hour of day user is most engaged |
| `channel_distribution` | Which channels user talks on most |

## SOUL.md Integration

Generate a section for your SOUL.md or USER.md:

```bash
node -e "
const { compactify, asSoulPatch, DEFAULT_CONFIG } = require('lineage-code-mini');
const fs = require('fs');
const historyPath = '{baseDir}/data/interactions.json';
const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : [];
const profile = compactify('current-user', history, DEFAULT_CONFIG);
console.log(asSoulPatch(profile));
"
```

Append the output to your USER.md for persistent behavioral adaptation.

## Data Storage

Interaction history is stored at `{baseDir}/data/interactions.json`. Profiles are stored at `{baseDir}/data/profiles/`. These are plain JSON files — portable, inspectable, no database required.

## Installation

```bash
npx clawhub@latest install lineage-mini
```

Or manually: copy this `skill/` directory into your `~/.openclaw/skills/lineage-mini/`.
