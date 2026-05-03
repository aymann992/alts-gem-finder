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

// Separate cache for non-CoinGecko sources.
const extCache = new Map<string, { at: number; data: any }>();
const extInflight = new Map<string, Promise<any>>();

async function extCachedFetch(url: string, ttlMs: number): Promise<any> {
  const hit = extCache.get(url);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.data;
  const existing = extInflight.get(url);
  if (existing) return existing;
  const job = (async () => {
    try {
      const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "AltPulse/1.0" } });
      if (!res.ok) {
        if (hit) return hit.data;
        throw new Error(`${url} failed: ${res.status}`);
      }
      const data = await res.json();
      extCache.set(url, { at: now, data });
      return data;
    } catch (err) {
      if (hit) return hit.data;
      throw err;
    } finally {
      extInflight.delete(url);
    }
  })();
  extInflight.set(url, job);
  return job;
}

async function extCachedFetchText(url: string, ttlMs: number): Promise<string> {
  const key = `TEXT:${url}`;
  const hit = extCache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.data as string;
  const existing = extInflight.get(key);
  if (existing) return existing as Promise<string>;
  const job = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/rss+xml, application/xml, text/xml, */*",
          "user-agent": "Mozilla/5.0 (compatible; AltPulse/1.0)",
        },
      });
      if (!res.ok) {
        if (hit) return hit.data as string;
        throw new Error(`${url} failed: ${res.status}`);
      }
      const text = await res.text();
      extCache.set(key, { at: now, data: text });
      return text;
    } catch (err) {
      if (hit) return hit.data as string;
      throw err;
    } finally {
      extInflight.delete(key);
    }
  })();
  extInflight.set(key, job);
  return job;
}

// Tiny RSS fetcher — extracts headlines from public crypto feeds (no API key).
async function fetchRss(url: string, source: string, ttlMs: number) {
  const xml = (await extCachedFetchText(url, ttlMs)) as string;
  const items: Array<{ title: string; url: string; source: string; published: string }> = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const pick = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (!m) return "";
    return m[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .trim();
  };
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml))) {
    const block = m[1];
    const title = pick(block, "title");
    const link = pick(block, "link");
    const pub = pick(block, "pubDate") || pick(block, "dc:date") || new Date().toUTCString();
    if (title && link) {
      items.push({ title, url: link, source, published: new Date(pub).toISOString() });
    }
    if (items.length >= 15) break;
  }
  return items;
}

const FEEDS: Array<{ url: string; source: string }> = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  { url: "https://decrypt.co/feed", source: "Decrypt" },
  { url: "https://cryptoslate.com/feed/", source: "CryptoSlate" },
];

export const cgNews = createServerFn({ method: "GET" }).handler(async () => {
  // Primary: aggregate public RSS feeds. Each feed is independently cached so
  // a single slow/failing source can't block the others.
  try {
    const results = await Promise.allSettled(
      FEEDS.map((f) => fetchRss(f.url, f.source, 5 * 60_000)),
    );
    const merged = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchRss>>> => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .sort((a, b) => +new Date(b.published) - +new Date(a.published))
      .slice(0, 40);
    if (merged.length) return merged;
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
    /* fall through to static fallback */
  }

  // Last-resort static fallback: curated source list so the UI never shows
  // an empty page. These are stable landing pages, not dated headlines.
  const now = new Date().toISOString();
  return [
    { title: "Latest crypto headlines on CoinDesk", url: "https://www.coindesk.com/", source: "CoinDesk", published: now },
    { title: "Markets & breaking news on Cointelegraph", url: "https://cointelegraph.com/", source: "Cointelegraph", published: now },
    { title: "The Block — research-driven crypto news", url: "https://www.theblock.co/", source: "The Block", published: now },
    { title: "Decrypt — daily crypto news & analysis", url: "https://decrypt.co/", source: "Decrypt", published: now },
    { title: "Bitcoin Magazine — BTC-focused coverage", url: "https://bitcoinmagazine.com/", source: "Bitcoin Magazine", published: now },
    { title: "CryptoSlate — news, prices & rankings", url: "https://cryptoslate.com/", source: "CryptoSlate", published: now },
  ];
});
