import { NextResponse } from "next/server";
import { fetchRoadmap } from "@/lib/marketing/fetch-roadmap";

// The configured Linear label is the publication boundary. fetchRoadmap keeps
// the API key server-side and fails closed to three empty columns.
export const revalidate = 60;

export async function GET() {
  const columns = await fetchRoadmap();
  return NextResponse.json(
    { columns },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
