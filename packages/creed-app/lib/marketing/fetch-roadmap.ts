import "server-only";

import { LinearRequestError, requestLinear } from "@/lib/linear";
import {
  collectLinearConnection,
  type LinearPage,
} from "@/lib/linear-pagination";
import {
  groupLinearIssuesIntoColumns,
  type RoadmapColumn,
} from "@/lib/marketing/roadmap";
import { log } from "@/lib/observability";

const ROADMAP_QUERY = `
  query PublicRoadmap(
    $projectId: String!
    $roadmapLabelId: ID!
    $after: String
  ) {
    project(id: $projectId) {
      issues(
        first: 250
        after: $after
        filter: { labels: { id: { eq: $roadmapLabelId } } }
      ) {
        nodes {
          id
          title
          description
          priority
          sortOrder
          createdAt
          state { type }
          labels { nodes { id name } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

type LinearRoadmapData = {
  project: {
    issues: LinearPage<unknown>;
  } | null;
};

export async function fetchRoadmap(): Promise<RoadmapColumn[]> {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  const projectId = process.env.LINEAR_ROADMAP_PROJECT_ID?.trim();
  const publicRoadmapLabelId =
    process.env.LINEAR_ROADMAP_LABEL_ID?.trim();
  if (!apiKey || !projectId || !publicRoadmapLabelId) {
    return groupLinearIssuesIntoColumns([], publicRoadmapLabelId ?? "");
  }

  try {
    const issues = await collectLinearConnection(async (after) => {
      const data = await requestLinear<LinearRoadmapData>({
        apiKey,
        query: ROADMAP_QUERY,
        variables: {
          projectId,
          roadmapLabelId: publicRoadmapLabelId,
          after,
        },
        revalidateSeconds: 60,
      });
      return (
        data.project?.issues ?? {
          nodes: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        }
      );
    });
    return groupLinearIssuesIntoColumns(issues, publicRoadmapLabelId);
  } catch (error) {
    log.error(
      "roadmap_upstream_error",
      {
        status: error instanceof LinearRequestError ? error.status : undefined,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return groupLinearIssuesIntoColumns([], publicRoadmapLabelId);
  }
}
