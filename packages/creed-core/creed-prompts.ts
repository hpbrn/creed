// The prompts Creed exposes over MCP (prompts/list + prompts/get).
export const CREED_PROMPTS = [
  {
    name: "introduce-me",
    description:
      "Read my Creed and introduce me the way a sharp collaborator would.",
    text: "Read my Creed with read_creed, then introduce me in a few tight sentences the way a sharp new collaborator would after reading my profile. Lead with what matters most about how to work with me.",
  },
  {
    name: "tighten-my-creed",
    description:
      "Review my Creed and propose tightening or pruning where it has drifted.",
    text: "Read my Creed with read_creed, then look for anything vague, stale, duplicated, or contradictory. Propose narrowly-scoped tightening or pruning with the creed_* tools, following the contract. If nothing durable needs changing, say so and propose nothing.",
  },
] as const;
