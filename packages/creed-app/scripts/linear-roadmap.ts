import {
  collectLinearConnection,
  type LinearPage,
} from "../lib/linear-pagination.ts";

type RoadmapStatus = "todo" | "in_progress" | "shipped";
type RoadmapLabel = "feature" | "improvement";

type LinearResponse<T> = {
  data?: T;
  errors?: { message?: unknown }[];
};

type LinearState = {
  id: string;
  name: string;
  type: string;
};

type LinearLabel = {
  id: string;
  name: string;
};

const endpoint = "https://api.linear.app/graphql";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is not configured.`);
  return value;
}

function parseArguments(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      fail("Expected paired --name value arguments.");
    }
    parsed[key.slice(2)] = value;
  }
  return parsed;
}

function isRoadmapStatus(value: string | undefined): value is RoadmapStatus {
  return value === "todo" || value === "in_progress" || value === "shipped";
}

function isRoadmapLabel(value: string | undefined): value is RoadmapLabel {
  return value === "feature" || value === "improvement";
}

async function requestLinear<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) fail(`Linear returned HTTP ${response.status}.`);

  const payload = (await response.json()) as LinearResponse<T>;
  if (payload.errors?.length) {
    const message = payload.errors
      .map((error) =>
        typeof error.message === "string" ? error.message : "Unknown error",
      )
      .join("; ");
    fail(`Linear rejected the request: ${message}`);
  }
  if (!payload.data) fail("Linear returned no data.");
  return payload.data;
}

function chooseState(
  states: LinearState[],
  status: RoadmapStatus,
): LinearState {
  const preferredName = {
    todo: "todo",
    in_progress: "in progress",
    shipped: "done",
  }[status];
  const fallbackTypes: Record<RoadmapStatus, string[]> = {
    todo: ["unstarted", "backlog"],
    in_progress: ["started"],
    shipped: ["completed"],
  };
  const state =
    states.find((candidate) => candidate.name.toLowerCase() === preferredName) ??
    states.find((candidate) => fallbackTypes[status].includes(candidate.type));
  if (!state) fail(`No Linear workflow state can represent ${status}.`);
  return state;
}

const args = parseArguments(process.argv.slice(2));
const title = args.title?.trim();
const description = args.description?.trim();
const roadmapStatus = args.status;
const roadmapLabel = args.label;

if (!title || !description) fail("Title and description are required.");
if (!isRoadmapStatus(roadmapStatus)) {
  fail("Status must be todo, in_progress, or shipped.");
}
if (!isRoadmapLabel(roadmapLabel)) {
  fail("Label must be feature or improvement.");
}

const apiKey = requiredEnvironment("LINEAR_API_KEY");
const teamId = requiredEnvironment("LINEAR_TEAM_ID");
const projectId = requiredEnvironment("LINEAR_ROADMAP_PROJECT_ID");
const roadmapLabelId = requiredEnvironment("LINEAR_ROADMAP_LABEL_ID");

const teamData = await requestLinear<{
  team: {
    states: { nodes: LinearState[] };
    labels: { nodes: LinearLabel[] };
  } | null;
}>(
  apiKey,
  `
    query RoadmapTeam($teamId: String!) {
      team(id: $teamId) {
        states { nodes { id name type } }
        labels { nodes { id name } }
      }
    }
  `,
  { teamId },
);

if (!teamData.team) fail("The configured Linear team was not found.");

type ExistingRoadmapIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
};

const existingIssues = await collectLinearConnection(
  async (after): Promise<LinearPage<ExistingRoadmapIssue>> => {
    const projectData = await requestLinear<{
      project: { issues: LinearPage<ExistingRoadmapIssue> } | null;
    }>(
      apiKey,
      `
        query RoadmapIssues(
          $projectId: String!
          $labelId: ID!
          $after: String
        ) {
          project(id: $projectId) {
            issues(
              first: 250
              after: $after
              filter: { labels: { id: { eq: $labelId } } }
            ) {
              nodes { id identifier title url }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      `,
      { projectId, labelId: roadmapLabelId, after },
    );
    if (!projectData.project) {
      fail("The configured Linear project was not found.");
    }
    return projectData.project.issues;
  },
);

const duplicate = existingIssues.find(
  (issue) => issue.title.trim().toLowerCase() === title.toLowerCase(),
);
if (duplicate) {
  fail(`A public roadmap issue already exists: ${duplicate.identifier}.`);
}

const cardLabel = teamData.team.labels.nodes.find(
  (candidate) => candidate.name.toLowerCase() === roadmapLabel,
);
if (!cardLabel) fail(`The ${roadmapLabel} Linear label was not found.`);
const state = chooseState(teamData.team.states.nodes, roadmapStatus);

const created = await requestLinear<{
  issueCreate: {
    success: boolean;
    issue: {
      id: string;
      identifier: string;
      title: string;
      url: string;
    } | null;
  };
}>(
  apiKey,
  `
    mutation CreateRoadmapIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url }
      }
    }
  `,
  {
    input: {
      title,
      description,
      teamId,
      projectId,
      stateId: state.id,
      labelIds: [roadmapLabelId, cardLabel.id],
    },
  },
);

if (!created.issueCreate.success || !created.issueCreate.issue) {
  fail("Linear did not create the roadmap issue.");
}

process.stdout.write(
  `${JSON.stringify({
    ...created.issueCreate.issue,
    description,
    label: roadmapLabel,
    status: roadmapStatus,
  })}\n`,
);
