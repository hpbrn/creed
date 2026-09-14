import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../src/app/api/feedback/route.ts";

let client = 0;
function request(body: unknown, identity = String(++client)) {
  return new Request("https://creed.example/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": identity,
    },
    body: JSON.stringify(body),
  });
}

test("feedback receiver", async (t) => {
  const original = { ...process.env };
  process.env.LINEAR_API_KEY = " test-key ";
  process.env.LINEAR_TEAM_ID = " test-team ";
  process.env.LINEAR_FEEDBACK_LABEL_ID = " test-label ";
  t.after(() => {
    for (const key of [
      "LINEAR_API_KEY",
      "LINEAR_TEAM_ID",
      "LINEAR_FEEDBACK_LABEL_ID",
    ]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  const upstream = t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, _options: RequestInit) =>
      Response.json({
        data: { issueCreate: { success: true, issue: { id: "test-issue" } } },
      }),
  );

  await t.test(
    "desktop feedback reaches the configured team and label without login",
    async () => {
      const response = await POST(
        request({
          message: "  A useful report\nMore detail  ",
          version: "1.0.0",
          teamId: "untrusted",
        }),
      );
      assert.equal(response.status, 202);
      assert.deepEqual(await response.json(), { ok: true });
      const [url, options] = upstream.mock.calls.at(-1)!.arguments;
      assert.equal(url, "https://api.linear.app/graphql");
      assert.equal(
        (options.headers as Record<string, string>).Authorization,
        "test-key",
      );
      assert.deepEqual(JSON.parse(String(options.body)).variables.input, {
        teamId: "test-team",
        title: "A useful report",
        description:
          "A useful report\nMore detail\n\n---\n\nCreed desktop 1.0.0",
        labelIds: ["test-label"],
      });
    },
  );

  await t.test("existing web form remains compatible", async () => {
    assert.equal(
      (
        await POST(
          request({
            content: "Web feedback",
            sourceUrl: "https://creed.example",
          }),
        )
      ).status,
      202,
    );
  });

  await t.test("invalid messages never reach Linear", async () => {
    const before = upstream.mock.callCount();
    for (const body of [
      null,
      [],
      {},
      { message: "  " },
      { message: 42 },
      { message: "x".repeat(10_001) },
      { message: false, content: "fallback" },
    ])
      assert.equal((await POST(request(body))).status, 400);
    assert.equal(upstream.mock.callCount(), before);
  });

  await t.test(
    "valid non-ASCII feedback fits the transport limit",
    async () => {
      assert.equal(
        (await POST(request({ message: "界".repeat(10_000) }))).status,
        202,
      );
    },
  );

  await t.test("malformed JSON and oversized bodies are rejected", async () => {
    const malformed = request({});
    assert.equal(
      (await POST(new Request(malformed, { body: "{" }))).status,
      400,
    );
    assert.equal(
      (await POST(request({ message: "x".repeat(64_001) }))).status,
      413,
    );
    const declared = request({});
    declared.headers.set("content-length", "64001");
    assert.equal((await POST(declared)).status, 413);
    const wrongType = request({});
    wrongType.headers.set("content-type", "text/plain");
    assert.equal((await POST(wrongType)).status, 415);
  });

  await t.test("repeated attempts are limited with a retry time", async () => {
    const identity = String(++client);
    for (let i = 0; i < 5; i++)
      assert.equal((await POST(request({}, identity))).status, 400);
    const limited = await POST(request({}, identity));
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
  });

  await t.test(
    "missing configuration fails without contacting Linear",
    async () => {
      delete process.env.LINEAR_API_KEY;
      const before = upstream.mock.callCount();
      assert.equal((await POST(request({ message: "Report" }))).status, 503);
      assert.equal(upstream.mock.callCount(), before);
      process.env.LINEAR_API_KEY = "test-key";
    },
  );

  await t.test(
    "HTTP, GraphQL, malformed responses and network failure never report success",
    async () => {
      for (const body of [
        null,
        {},
        { errors: [{ message: "Failed" }] },
        { data: { issueCreate: { success: false } } },
        { data: { issueCreate: { success: true } } },
      ]) {
        upstream.mock.mockImplementation(async () => Response.json(body));
        assert.equal((await POST(request({ message: "Report" }))).status, 502);
      }
      upstream.mock.mockImplementation(
        async () => new Response("", { status: 500 }),
      );
      assert.equal((await POST(request({ message: "Report" }))).status, 502);
      upstream.mock.mockImplementation(async () => {
        throw new Error("Offline");
      });
      assert.equal((await POST(request({ message: "Report" }))).status, 502);
    },
  );
});
