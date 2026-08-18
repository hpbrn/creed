import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  reviewSharedProposal,
  reviewPersonalProposal,
} from "@/lib/shared-sections";
import { getOwnedPersonalCreedId } from "@/lib/creed-membership";
import { getSupabaseAdminClient } from "@creed/persistence/supabase/admin";
import type { SupabaseLikeClient } from "@creed/persistence/supabase/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as { creedId?: unknown; decision?: unknown };
  if (
    typeof b.creedId !== "string" ||
    (b.decision !== "accept" &&
      b.decision !== "reject" &&
      b.decision !== "withdraw" &&
      b.decision !== "dismiss" &&
      b.decision !== "stale")
  ) {
    return NextResponse.json(
      { error: "creedId and decision are required." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const personalCreedId = await getOwnedPersonalCreedId(
    admin,
    auth.user.id,
    b.creedId,
  );
  const isPersonal = personalCreedId === b.creedId;
  const result = isPersonal
    ? await reviewPersonalProposal({
        creedId: b.creedId,
        user: auth.user,
        proposalId: id,
        decision:
          b.decision === "accept" ||
          b.decision === "dismiss" ||
          b.decision === "stale"
            ? b.decision
            : "reject",
      })
    : b.decision === "stale"
      ? null
      : await reviewSharedProposal({
          creedId: b.creedId,
          user: auth.user,
          proposalId: id,
          decision: b.decision,
        });

  if (!result) {
    return NextResponse.json(
      { error: "That proposal decision is not available." },
      { status: 400 },
    );
  }

  if (!result.ok) {
    const status =
      result.code === "forbidden"
        ? 403
        : result.code === "not_found"
          ? 404
          : result.code === "stale" || result.code === "conflict"
            ? 409
            : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json(result);
}
