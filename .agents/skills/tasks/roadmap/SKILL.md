---
name: roadmap
description: Add a public Creed roadmap issue to the configured Linear project. Load only when the user invokes /roadmap or $roadmap. If they invoke it with no idea, ask what to add and wait. If they invoke it with an idea, draft the public card and create it. Do not load from a passing product idea in conversation. Do not use for bugs, refactors, chores, secrets, or parked-not-now bets in .agents/context/roadmap.md.
---

# Roadmap

Publish one Linear issue that matches the existing `/roadmap` voice. Issues carrying the configured `public-roadmap` label become public within about a minute. Creating the issue is consequential; drafting is not.

This skill is discoverable, not pre-installed. Load only on `/roadmap` or `$roadmap`. Do not add it to standing agent routing.

## Activation

**Manual only.** Load when the user invokes `/roadmap` or `$roadmap`. Treat `$roadmap` as the portable fallback if the client has no slash command. Do not load because an idea came up in chat. Do not offer to add a card unprompted.

Invocation loads this workflow. It does not waive copy rules, deduplication, or authentication gates.

**If the invocation has no idea** (`/roadmap` alone): ask what they want on the public roadmap. Wait. Do not invent a card.

**If the invocation includes an idea** (`/roadmap Any-Provider BYOK`, or `/roadmap` then the idea in the next message): draft the card from that idea and create it. Do not ask a second time whether to publish. If the idea is too vague to write a public title and one-sentence description, ask one clarifying question, then create.

## Authentication

The creation script reads Linear credentials and target IDs from `apps/cloud/.env.local`. Never print, commit, or paste `LINEAR_API_KEY` into chat. Stop and ask the user to configure these values if any are missing:

- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID`
- `LINEAR_ROADMAP_PROJECT_ID`
- `LINEAR_ROADMAP_LABEL_ID`

## Do not

- Write to `.agents/context/roadmap.md`. That file contains parked internal bets, not the public board.
- Create the issue without the repository script. It owns target selection, workflow mapping, and duplicate protection.
- Put feedback, bugs, chores, secrets, dates, internal jargon, hype, emoji, or empty descriptions on the public board.
- Add internal labels to the public response. Only `feature` and `improvement` are displayed.

## Card shape

The public UI shows the title, description, and card label verbatim. Linear workflow states map as Backlog or Todo to Next, started states to In Progress, and completed states to Shipped. Canceled and duplicate issues stay hidden.

- **Title:** the product object, 2-5 words. `Creed CLI`, not `Add a CLI` or `CON-12`. Put Open or Cloud in the title when the same capability has two surfaces.
- **Description:** one outcome sentence that does not repeat the title. Use only canonical terms: Creed, Open, Cloud, Shared Creeds, Nexus, and Bench. Use two paragraphs only for a product-line positioning card.
- **Label:** exactly one of `feature` or `improvement`.
- **Status:** `todo` unless the user says it is already in progress or shipped.

Apply `.agents/skills/tasks/copy/SKILL.md` to the title and description.

Good:

```text
Title: Creed Skills
Description: Structured capabilities that help agents retrieve and use the right Creed context more intelligently.
Label: feature
Status: todo
```

Bad: `Implement skills system`, empty descriptions, `refactor`, `p0`, or a how-we-will-build paragraph.

## Workflow

1. If there is no idea yet, ask what to add and stop until they answer.
2. Decide fit. Stop if the idea is a bug, refactor, chore, secret, or a parked-not-now bet.
3. Draft the title, description, label, and status.
4. Deduplicate against `GET https://creed.md/api/roadmap`. Stop if the same product object already exists.
5. Create from the repository root:

```bash
node --env-file=apps/cloud/.env.local --experimental-strip-types packages/creed-app/scripts/linear-roadmap.ts --title "Creed Skills" --description "Structured capabilities that help agents retrieve and use the right Creed context more intelligently." --status todo --label feature
```

6. Report the exact issue, its Linear identifier, its public column, and that `/roadmap` may take about 60 seconds to refresh.

## Report

Report one issue: title, label, status, and Linear identifier.
