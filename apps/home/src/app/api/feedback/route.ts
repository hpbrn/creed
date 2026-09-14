const attempts = new Map<string, { count: number; reset: number }>();
const MAX_BODY_BYTES = 64_000;

function failure(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

export async function POST(request: Request) {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  const teamId = process.env.LINEAR_TEAM_ID?.trim();
  const label = process.env.LINEAR_FEEDBACK_LABEL_ID?.trim();
  if (!apiKey || !teamId) return failure("Feedback is not configured.", 503);

  const identity =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.reset <= now) attempts.delete(key);
  const attempt = attempts.get(identity) ?? { count: 0, reset: now + 60_000 };
  if (
    attempt.count >= 5 ||
    (!attempts.has(identity) && attempts.size >= 10_000)
  )
    return failure("Please try again shortly.", 429, {
      "Retry-After": String(
        Math.max(1, Math.ceil((attempt.reset - now) / 1000)),
      ),
    });
  attempt.count++;
  attempts.set(identity, attempt);

  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    return failure("Send feedback as JSON.", 415);
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    return failure("Feedback is too long.", 413);

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return failure("Write some feedback first.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return failure("Feedback is too long.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure("Feedback could not be read.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return failure("Write some feedback first.", 400);
  const content =
    "message" in body ? body.message : "content" in body ? body.content : null;
  if (typeof content !== "string" || !content.trim())
    return failure("Write some feedback first.", 400);
  if (content.length > 10_000)
    return failure("Keep feedback within 10,000 characters.", 400);

  const message = content.trim();
  const version =
    "version" in body &&
    typeof body.version === "string" &&
    /^[\w.+-]{1,40}$/.test(body.version)
      ? body.version
      : null;
  const description =
    message +
    "\n\n---\n\n" +
    ("message" in body
      ? "Creed desktop" + (version ? " " + version : "")
      : "Creed website");
  try {
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "mutation Feedback($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id } } }",
        variables: {
          input: {
            teamId,
            title: message.split(/\r?\n/)[0].slice(0, 120),
            description,
            ...(label ? { labelIds: [label] } : {}),
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      return failure("Could not deliver feedback. Please try again.", 502);
    const result = (await response.json()) as {
      errors?: unknown;
      data?: { issueCreate?: { success?: unknown; issue?: { id?: unknown } } };
    } | null;
    const created = result?.data?.issueCreate;
    if (
      result?.errors ||
      created?.success !== true ||
      typeof created.issue?.id !== "string" ||
      !created.issue.id
    )
      return failure("Could not deliver feedback. Please try again.", 502);
    return Response.json({ ok: true }, { status: 202 });
  } catch {
    return failure("Could not deliver feedback. Please try again.", 502);
  }
}
