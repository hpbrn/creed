import { NextResponse } from "next/server";
import { getOpenVersionFromReleaseTag } from "@/lib/open-release";

export const revalidate = 3600;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
} as const;

export async function GET() {
  try {
    const response = await fetch(
      "https://api.github.com/repos/hpbrn/creed/releases/latest",
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) {
      return NextResponse.json({ version: null }, { headers: CACHE_HEADERS });
    }

    const payload = (await response.json()) as { tag_name?: unknown };
    const version =
      typeof payload.tag_name === "string"
        ? getOpenVersionFromReleaseTag(payload.tag_name)
        : null;
    return NextResponse.json({ version }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ version: null }, { headers: CACHE_HEADERS });
  }
}
