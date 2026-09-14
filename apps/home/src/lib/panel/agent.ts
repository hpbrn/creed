// The Agent route streams NDJSON progress so the panel can show real,
// honest stages instead of a frozen spinner.
export type AgentStage = "reading" | "planning" | "writing" | "filing" | "done";

export const AGENT_STAGE_LABEL: Record<AgentStage, string> = {
  reading: "Reading your creed",
  planning: "Planning the change",
  writing: "Writing the edit",
  filing: "Saving changes",
  done: "Done",
};
