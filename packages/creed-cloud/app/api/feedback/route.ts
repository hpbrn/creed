import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { requestLinear } from "@/lib/linear";
import { log } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";

const CREATE_FEEDBACK_ISSUE = `
  mutation CreateFeedbackIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier }
    }
  }
`;

type LinearIssueCreateData = {
  issueCreate: {
    success: boolean;
    issue: { id: string; identifier: string } | null;
  };
};

function feedbackTitle(content: string): string {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "Creed feedback";
  return firstLine.length > 120
    ? `${firstLine.slice(0, 117).trimEnd()}...`
    : firstLine;
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const rateLimit = await checkRateLimit({
    scope: "feedback",
    identifier: auth.user.id,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many feedback requests." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const apiKey = process.env.LINEAR_API_KEY?.trim();
  const teamId = process.env.LINEAR_TEAM_ID?.trim();
  const feedbackLabelId = process.env.LINEAR_FEEDBACK_LABEL_ID?.trim();
  if (!apiKey || !teamId || !feedbackLabelId) {
    log.warn("feedback_not_configured", { userId: auth.user.id });
    return NextResponse.json(
      { error: "Feedback isn't configured for this deployment." },
      { status: 503 },
    );
  }

  let body: { content?: unknown; sourceUrl?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json(
      { error: "Feedback can't be empty." },
      { status: 400 },
    );
  }
  if (content.length > 10_000) {
    return NextResponse.json(
      { error: "Feedback is too long (10k characters max)." },
      { status: 400 },
    );
  }

  const sourceUrl =
    typeof body.sourceUrl === "string" && body.sourceUrl.length <= 500
      ? body.sourceUrl
      : undefined;
  const author = auth.user.email ?? auth.user.id;
  const context = [
    sourceUrl ? `Source: ${sourceUrl}` : null,
    `Submitted by: ${author}`,
  ].filter((line): line is string => Boolean(line));
  const description = `${content}\n\n---\n\n${context.join("\n")}`;

  try {
    const data = await requestLinear<LinearIssueCreateData>({
      apiKey,
      query: CREATE_FEEDBACK_ISSUE,
      variables: {
        input: {
          title: feedbackTitle(content),
          description,
          teamId,
          labelIds: [feedbackLabelId],
        },
      },
    });
    if (!data.issueCreate.success || !data.issueCreate.issue) {
      throw new Error("linear_issue_create_failed");
    }

    log.info("feedback_sent", {
      userId: auth.user.id,
      issueId: data.issueCreate.issue.id,
      issueIdentifier: data.issueCreate.issue.identifier,
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    log.error(
      "feedback_upstream_error",
      { userId: auth.user.id },
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Couldn't reach feedback service." },
      { status: 502 },
    );
  }
}
