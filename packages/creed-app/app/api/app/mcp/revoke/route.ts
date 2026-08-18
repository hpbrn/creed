import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { inferAgentIconKind } from "@/lib/creed-backend";
import { revokeOAuthTokensForUser } from "@/lib/oauth";
import { getSupabaseAdminClient } from "@creed/persistence/supabase/admin";
import type { SupabaseLikeClient } from "@creed/persistence/supabase/types";

// Disconnects one agent: revokes its OAuth tokens, clears its roster rows, and
// marks persisted `creed_connections` as not-connected so the card cannot
// relight from stale usage. Cards are keyed by brand icon while tokens are
// keyed by OAuth client_id, so both are matched the same way the UI matches
// them, by the icon their client name resolves to.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { icon?: string };
  const icon = typeof body.icon === "string" ? body.icon.trim() : "";
  if (!icon) {
    return NextResponse.json({ error: "Missing agent icon." }, { status: 400 });
  }

  // The admin client's generated types do not cover these tables.
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;

  // Revoke OAuth tokens whose registered client name resolves to this icon.
  const { data: tokenRows, error: tokenError } = await admin
    .from("oauth_tokens")
    .select("client_id")
    .eq("user_id", auth.user.id)
    .is("revoked_at", null);
  if (tokenError) {
    return NextResponse.json({ error: "Could not load tokens." }, { status: 500 });
  }
  const clientIds = [
    ...new Set(
      ((tokenRows as { client_id: string }[] | null) ?? []).map((row) => row.client_id),
    ),
  ];
  if (clientIds.length > 0) {
    const { data: oauthClients, error: clientError } = await admin
      .from("oauth_clients")
      .select("client_id, client_name")
      .in("client_id", clientIds);
    if (clientError) {
      return NextResponse.json({ error: "Could not load clients." }, { status: 500 });
    }
    const clientRows =
      (oauthClients as { client_id: string; client_name: string }[] | null) ?? [];
    for (const client of clientRows) {
      if (inferAgentIconKind(client.client_name) === icon) {
        await revokeOAuthTokensForUser(auth.user.id, client.client_id);
      }
    }
  }

  // Clear matching roster rows so connected/last-seen status resets. The
  // roster's client_name is the MCP clientInfo name, which resolves through
  // the same alias table as the card icons.
  const { data: rosterRows, error: rosterError } = await admin
    .from("creed_mcp_clients")
    .select("client_id, client_name, creed_id")
    .eq("user_id", auth.user.id);
  if (rosterError) {
    return NextResponse.json({ error: "Could not load MCP clients." }, { status: 500 });
  }
  const matchingRoster = (
    (rosterRows as {
      client_id: string;
      client_name: string;
      creed_id: string;
    }[] | null) ?? []
  ).filter((row) => inferAgentIconKind(row.client_name) === icon);
  const rosterIds = matchingRoster.map((row) => row.client_id);
  if (rosterIds.length > 0) {
    const { error: deleteError } = await admin
      .from("creed_mcp_clients")
      .delete()
      .eq("user_id", auth.user.id)
      .in("client_id", rosterIds);
    if (deleteError) {
      return NextResponse.json({ error: "Could not disconnect agent." }, { status: 500 });
    }
  }

  // Cards OR live roster with persisted `creed_connections.status`. Leaving
  // that row `connected` would relight the status after refresh even though
  // tokens and roster are gone.
  const { data: connectionRows, error: connectionStatusError } = await admin
    .from("creed_connections")
    .update({
      status: "not-connected",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.user.id)
    .eq("connection_id", icon)
    .select("creed_id");
  if (connectionStatusError) {
    return NextResponse.json(
      { error: "Could not update connection status." },
      { status: 500 },
    );
  }

  // Roster and connection rows do not bump `creeds.sync_updated_at`, so the
  // client state poll would otherwise keep serving the pre-revoke snapshot.
  const creedIds = [
    ...new Set([
      ...matchingRoster.map((row) => row.creed_id),
      ...((connectionRows as { creed_id: string }[] | null) ?? []).map(
        (row) => row.creed_id,
      ),
    ]),
  ].filter(Boolean);
  if (creedIds.length > 0) {
    await admin
      .from("creeds")
      .update({ sync_updated_at: new Date().toISOString() })
      .in("id", creedIds);
  }

  return NextResponse.json({ ok: true, revokedClients: rosterIds.length });
}
