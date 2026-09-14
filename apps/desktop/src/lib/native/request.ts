import { healthSummary } from "./health";
import { invoke } from "@tauri-apps/api/core";
import { action, flushEdits, workspace } from "./workspace";

import { getAgentIconKind } from "@/lib/agent-icon";
import { nativeAiRequest } from "./ai-requests";
import { setAiEnabled } from "./ai-availability";

export function json(value: unknown, status = 200) {
  return Response.json(value, { status });
}
export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
export function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function nativeRequest(
  input: string | URL | Request,
  init: RequestInit = {},
): Promise<Response> {
  try {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      "http://creed.local",
    );
    const body =
      typeof init.body === "string" ? object(JSON.parse(init.body)) : {};
    const documentId =
      new Headers(init.headers).get("x-creed-id") ??
      (text(body.creedId) ||
        url.searchParams.get("creedId") ||
        workspace().activeId);
    const document = workspace().documents.find(
      (item) => item.id === documentId,
    );
    const method = init.method ?? "GET";
    if (url.pathname === "/api/feedback") {
      await invoke("send_feedback", { message: text(body.content) });
      return json({ ok: true });
    }
    if (url.pathname === "/api/app/ai/settings") {
      if (method !== "GET") {
        if (body.clearApiKey) await invoke("save_key", { value: "" });
        else if (typeof body.apiKey === "string") {
          await invoke<boolean>("save_key", { value: body.apiKey });
          localStorage.setItem("creed:key-last-four", body.apiKey.slice(-4));
        }
      }
      const configured = await invoke<boolean>("key_status");
      if (method !== "GET") setAiEnabled(configured);
      const keyLastFour = configured
        ? await invoke<string | null>("key_last_four").catch(
            () => localStorage.getItem("creed:key-last-four"),
          )
        : undefined;
      return json({
        settings: {
          provider: "openrouter",
          keyStatus: configured ? "valid" : "missing",
          aiMode: "byok",
          keyLastFour: keyLastFour ?? undefined,
        },
        features: { analysis: configured, panel: configured, tab: configured },
      });
    }
    if (!document) return json({ error: "Open a Creed first." }, 404);
    if (url.pathname === "/api/app/creeds/general") {
      await flushEdits();
      await action(document.id, { kind: "rename-file", name: text(body.name) });
      return json({ ok: true });
    }
    if (url.pathname === "/api/app/creeds" && method === "DELETE") {
      await flushEdits();
      const current = workspace().documents.find(
        (item) => item.id === document.id,
      )!;
      const state = await action(document.id, {
        kind: "delete-file",
        baseline: current.revision,
      });
      return json({ ok: true, nextCreedId: state.activeId });
    }
    if (url.pathname === "/api/app/profile/avatar") {
      const file = init.body instanceof FormData ? init.body.get("file") : null;
      if (
        !(file instanceof File) ||
        !/^image\/(png|jpeg|webp|gif)$/.test(file.type) ||
        file.size > 2_000_000
      )
        return json(
          { error: "Choose a PNG, JPEG, WebP, or GIF under 2 MB." },
          400,
        );
      const avatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      localStorage.setItem(
        `creed:avatar:${document.id}`,
        JSON.stringify(avatarUrl),
      );
      return json({ avatarUrl });
    }
    if (url.pathname.startsWith("/api/app/ai/"))
      return await nativeAiRequest(
        url,
        body,
        document,
        init.signal ?? undefined,
      );
    if (url.pathname === "/api/app/mcp/live")
      return json({
        icons: [
          ...new Set(
            document.connections.map((connection) =>
              getAgentIconKind(connection.agent),
            ),
          ),
        ],
      });
    if (url.pathname === "/api/app/mcp/test")
      return json({
        connected: document.connections.some(
          (connection) =>
            getAgentIconKind(connection.agent) === url.searchParams.get("icon"),
        ),
      });
    if (url.pathname === "/api/app/mcp/revoke") {
      const icon = text(body.icon, url.searchParams.get("icon") ?? "");
      for (const connection of document.connections.filter(
        (connection) => getAgentIconKind(connection.agent) === icon,
      ))
        await action(document.id, {
          kind: "revoke",
          connectionId: connection.id,
        });
      return json({ ok: true });
    }
    if (url.pathname === "/api/app/mcp/health")
      return json({
        health: healthSummary(document, url.searchParams.get("range") ?? "30d"),
      });
    const history = url.pathname.match(
      /^\/api\/app\/sections\/([^/]+)\/(versions|restore)$/,
    );
    if (history) {
      const sectionId = decodeURIComponent(history[1]);
      if (history[2] === "versions")
        return json({
          versions: document.history
            .filter((entry) =>
              entry.sections?.some((section) => section.id === sectionId),
            )
            .reverse()
            .map((entry, index, entries) => ({
              id: entry.id,
              revision: entries.length - index,
              name: "",
              cause: entry.reason,
              actorType: "user",
              agentName: null,
              createdAt: new Date(entry.timestamp).toISOString(),
            })),
        });
      await flushEdits();
      await action(document.id, {
        kind: "restore-section",
        sectionId,
        revisionId: body.versionId,
      });
      return json({ ok: true });
    }
    return json(
      { error: `Unsupported desktop operation: ${url.pathname}` },
      404,
    );
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      400,
    );
  }
}
