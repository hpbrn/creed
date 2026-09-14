"use client";

// Fetches the public roadmap columns from the cached `/api/roadmap` route for
// the landing-page roadmap. The result is cached at module
// scope so re-mounts (e.g. client-side navigations) reuse it, but the cache
// expires after CACHE_TTL_MS so it stays in step with the route's own ~60s
// refresh. Null means loading; an empty list means no public updates are available.
import { useEffect, useState } from "react";
import type { RoadmapColumn } from "@/lib/marketing/roadmap";

const CACHE_TTL_MS = 60_000;

let cached: { columns: RoadmapColumn[] | null; at: number } | undefined;

export function useRoadmap(): RoadmapColumn[] | null {
  const [columns, setColumns] = useState<RoadmapColumn[] | null>(
    cached?.columns ?? null,
  );

  useEffect(() => {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setColumns(cached.columns);
      return;
    }

    let active = true;
    fetch("/api/roadmap")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { columns: RoadmapColumn[] } | null) => {
        const next = Array.isArray(data?.columns) ? data.columns : [];
        cached = { columns: next, at: Date.now() };
        if (active) setColumns(next);
      })
      .catch(() => {
        cached = { columns: [], at: Date.now() };
        if (active) setColumns([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return columns;
}
