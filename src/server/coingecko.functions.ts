import { createServerFn } from "@tanstack/react-start";

const BASE = "https://api.coingecko.com/api/v3";

// Module-scoped cache. In a Worker this lives for the duration of the
// isolate — enough to smooth out bursty traffic and dodge 429s.
// We serve "fresh" within ttlMs, and "stale" indefinitely on errors so the
// UI always has something to show after the first successful fetch.
const cache = new Map<string, { at: number; data: any }>();

// In-flight dedupe: collapse concurrent requests for the same path so a burst
// of users doesn't trigger N parallel CoinGecko calls.
const inflight = new Map<string, Promise<any>>();

async function cachedFetch(path: string, ttlMs: number): Promise<any> {
  const key = path;
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.data;

  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { accept: "application/json", "user-agent": "AltPulse/1.0" },
      });

      if (!res.ok) {
        // Any non-OK (429, 5xx, 422, etc.): prefer stale data over failing.
        if (hit) return hit.data;
        throw new Error(`CoinGecko ${path} failed: ${res.status}`);
      }
      const data = await res.json();
      cache.set(key, { at: now, data });
      return data;
    } catch (err) {
      // Network/parse error: serve stale if we have it.
      if (hit) return hit.data;
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

export const cgMarkets = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const x = (d ?? {}) as { vs?: string; page?: number; perPage?: number; ids?: string[] };
    return {
      vs: x.vs ?? "usd",
      page: x.page ?? 1,
      perPage: x.perPage ?? 50,
      ids: x.ids,
    };
  })
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      vs_currency: data.vs,
      order: "market_cap_desc",
      per_page: String(data.perPage),
      page: String(data.page),
      sparkline: "true",
      price_change_percentage: "1h,24h,7d,30d",
    });
    if (data.ids?.length) params.set("ids", data.ids.join(","));
    return cachedFetch(`/coins/markets?${params.toString()}`, 60_000);
  });

export const cgSearch = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const x = (d ?? {}) as { q?: string };
    return { q: (x.q ?? "").trim() };
  })
  .handler(async ({ data }) => {
    if (!data.q) return { coins: [] };
    return cachedFetch(`/search?query=${encodeURIComponent(data.q)}`, 30_000);
  });

export const cgDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const x = (d ?? {}) as { id?: string };
    if (!x.id) throw new Error("id required");
    return { id: x.id };
  })
  .handler(async ({ data }) => {
    return cachedFetch(
      `/coins/${data.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`,
      60_000,
    );
  });

export const cgHistory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const x = (d ?? {}) as { id?: string; days?: number; vs?: string };
    if (!x.id) throw new Error("id required");
    return { id: x.id, days: x.days ?? 30, vs: x.vs ?? "usd" };
  })
  .handler(async ({ data }) => {
    return cachedFetch(
      `/coins/${data.id}/market_chart?vs_currency=${data.vs}&days=${data.days}`,
      60_000,
    );
  });

export const cgNews = createServerFn({ method: "GET" }).handler(async () => {
  // Try the news endpoint (requires page=1), fall back to status_updates.
  try {
    const data = (await cachedFetch(`/news?page=1`, 5 * 60_000)) as {
      data?: Array<{ title: string; url: string; news_site: string; updated_at: number }>;
    };
    const items = data.data ?? [];
    if (items.length) {
      return items.slice(0, 30).map((n) => ({
        title: n.title,
        url: n.url,
        source: n.news_site,
        published: new Date(n.updated_at * 1000).toISOString(),
      }));
    }
  } catch {
    /* fall through */
  }
  try {
    const data = (await cachedFetch(`/status_updates?per_page=30`, 5 * 60_000)) as {
      status_updates?: Array<{
        description?: string;
        created_at: string;
        project?: { id?: string; name?: string; public_notice?: string };
      }>;
    };
    return (data.status_updates ?? []).map((u) => ({
      title: u.description?.slice(0, 160) ?? "Update",
      url:
        u.project?.public_notice ??
        `https://www.coingecko.com/en/coins/${u.project?.id ?? ""}`,
      source: u.project?.name ?? "CoinGecko",
      published: new Date(u.created_at).toISOString(),
    }));
  } catch {
    return [];
  }
});
