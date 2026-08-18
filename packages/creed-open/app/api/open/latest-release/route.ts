import { NextResponse } from "next/server";
import { findLatestOpenRelease } from "@/lib/open-release";

export const revalidate = 3600;

export async function GET() {
  try {
    const version = await findLatestOpenRelease(async (page) => {
      const response = await fetch(
        `https://api.github.com/repos/hpbrn/creed/releases?per_page=100&page=${page}`,
        {
          headers: { Accept: "application/vnd.github+json" },
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) throw new Error("Release lookup unavailable");
      return response.json();
    });
    return NextResponse.json({ version }, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  } catch {
    return NextResponse.json({ version: null }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
