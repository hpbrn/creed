import { fetchForCreed } from "@/lib/creed-request";

export type AiMode = "credits" | "byok";

export type PublicAiSettings = {
  provider: "openrouter";
  keyStatus: "missing" | "valid" | "invalid";
  aiMode: AiMode;
  keyLastFour?: string;
  lastValidatedAt?: string;
};

export type AiUsageRange = "7d" | "30d" | "90d" | "all";

// Spend is tagged by feature (Analysis today; Tab/CMD-K later), not by model,
// and each cost is the amount actually charged.
export type AiUsageSummary = {
  range: AiUsageRange;
  totalCostUsd: number;
  byFeature: Array<{ feature: string; costUsd: number }>;
  days: Array<{
    date: string;
    segments: Array<{ feature: string; costUsd: number }>;
  }>;
};

export type OpenRouterBalance = {
  usageUsd: number;
  limitUsd: number | null;
  remainingUsd: number | null;
};

type CacheEntry<T> = {
  value: T | null;
  promise: Promise<T> | null;
};
const aiSettingsCache: CacheEntry<PublicAiSettings | null> = {
  value: null,
  promise: null,
};
const usageCache = new Map<string, CacheEntry<AiUsageSummary | null>>();
const openRouterBalanceCache: CacheEntry<OpenRouterBalance | null> = {
  value: null,
  promise: null,
};

async function readJson<T>(url: string, creedId?: string) {
  const response = await fetchForCreed(creedId, url, {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Could not load settings data.");
  }

  return payload;
}

export function loadSettingsAiSettings() {
  if (aiSettingsCache.value) {
    return Promise.resolve(aiSettingsCache.value);
  }

  if (!aiSettingsCache.promise) {
    aiSettingsCache.promise = readJson<{ settings?: PublicAiSettings }>(
      "/api/app/ai/settings",
    )
      .then((payload) => {
        aiSettingsCache.value = payload.settings ?? null;
        return aiSettingsCache.value;
      })
      .finally(() => {
        aiSettingsCache.promise = null;
      });
  }

  return aiSettingsCache.promise;
}

export function setCachedSettingsAiSettings(settings: PublicAiSettings) {
  aiSettingsCache.value = settings;
}

export function loadSettingsUsage(
  range: AiUsageRange,
  mode: AiMode,
  creedId?: string,
) {
  const key = `${creedId}:${range}:${mode}`;
  const cached = usageCache.get(key) ?? { value: null, promise: null };
  usageCache.set(key, cached);

  if (!cached.promise) {
    cached.promise = readJson<{ usage?: AiUsageSummary }>(
      `/api/app/ai/usage?range=${range}&mode=${mode}`,
      creedId,
    )
      .then((payload) => {
        cached.value = payload.usage ?? null;
        return cached.value;
      })
      .finally(() => {
        cached.promise = null;
      });
  }

  return cached.promise;
}

export function clearSettingsUsageCache() {
  usageCache.clear();
}

// The user's live OpenRouter balance is volatile, so it always refetches.
export function loadSettingsOpenRouterBalance() {
  if (!openRouterBalanceCache.promise) {
    openRouterBalanceCache.promise = readJson<{
      balance?: OpenRouterBalance | null;
    }>("/api/app/ai/openrouter-balance")
      .then((payload) => {
        openRouterBalanceCache.value = payload.balance ?? null;
        return openRouterBalanceCache.value;
      })
      .finally(() => {
        openRouterBalanceCache.promise = null;
      });
  }

  return openRouterBalanceCache.promise;
}

export function clearSettingsOpenRouterBalanceCache() {
  openRouterBalanceCache.value = null;
  openRouterBalanceCache.promise = null;
}

export function preloadSettingsData({ creedId }: { creedId?: string }) {
  void loadSettingsAiSettings().catch(() => null);
  void loadSettingsUsage("all", "byok", creedId).catch(() => null);
}
