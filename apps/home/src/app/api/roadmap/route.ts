import { requestLinear } from "@/lib/linear";
import {
  collectLinearConnection,
  type LinearPage,
} from "@/lib/linear-pagination";
import { groupLinearIssuesIntoColumns } from "@/lib/marketing/roadmap";

export async function GET() {
  const apiKey = process.env.LINEAR_API_KEY;
  const projectId = process.env.LINEAR_ROADMAP_PROJECT_ID;
  const labelId = process.env.LINEAR_ROADMAP_LABEL_ID;
  if (!apiKey || !projectId || !labelId)
    return Response.json(
      { error: "The roadmap is not available yet." },
      { status: 503 },
    );
  try {
    const issues = await collectLinearConnection(async (after) => {
      const data = await requestLinear<{
        project: { issues: LinearPage<unknown> } | null;
      }>({
        apiKey,
        revalidateSeconds: 60,
        query: `query PublicRoadmap($projectId: String!, $labelId: ID!, $after: String) { project(id: $projectId) { issues(first: 100, after: $after, filter: { labels: { id: { eq: $labelId } } }) { nodes { id title description sortOrder priority createdAt state { type } labels { nodes { id name } } } pageInfo { hasNextPage endCursor } } } }`,
        variables: { projectId, labelId, after },
      });
      if (!data.project) throw new Error("Roadmap project not found");
      return data.project.issues;
    });
    return Response.json(
      { columns: groupLinearIssuesIntoColumns(issues, labelId) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "The roadmap is temporarily unavailable." },
      { status: 503 },
    );
  }
}
