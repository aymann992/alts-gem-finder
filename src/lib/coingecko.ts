// Pure client-side CoinGecko wrappers. No server functions — calls go straight
// from the browser so the app works inside a static Capacitor APK with no SSR
// runtime. CoinGecko's public API enables CORS, so this works from any origin.

const BASE = "https://api.coingecko.com/api/v3";

// In-memory cache to smooth out repeated calls and dodge 429s on the free tier.
const cache = new Map<string, { at: number; data: any }>();
const inflight = new Map<string, Promise<any>>();

async function cachedFetch(path: string, ttlMs: number): Promise<any> {
  const hit = cache.get(path);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.data;

  const existing = inflight.get(path);
  if (existing) return existing;

  const job = (async () => {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
      if (!res.ok) {
        if (hit) return hit.data; // serve stale on errors
        throw new Error(`CoinGecko ${path} failed: ${res.status}`);
      }
      const data = await res.json();
      cache.set(path, { at: now, data });
      return data;
    } catch (err) {
      if (hit) return hit.data;
      throw err;
    } finally {
      inflight.delete(path);
    }
  })();
  inflight.set(path, job);
  return job;
}

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
}

export async function fetchMarkets(params: {
  vs?: string;
  page?: number;
  perPage?: number;
  ids?: string[];
} = {}): Promise<MarketCoin[]> {
  const vs = params.vs ?? "usd";
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 50;
  const qs = new URLSearchParams({
    vs_currency: vs,
    order: "market_cap_desc",
    per_page: String(perPage),
    page: String(page),
    sparkline: "true",
    price_change_percentage: "1h,24h,7d,30d",
  });
  if (params.ids?.length) qs.set("ids", params.ids.join(","));
  return (await cachedFetch(`/coins/markets?${qs.toString()}`, 60_000)) as MarketCoin[];
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
}

export async function searchCoins(q: string): Promise<CoinSearchResult[]> {
  if (!q.trim()) return [];
  const data = (await cachedFetch(`/search?query=${encodeURIComponent(q)}`, 30_000)) as {
    coins?: CoinSearchResult[];
  };
  return (data.coins ?? []).slice(0, 12);
}

export async function fetchCoinDetail(id: string): Promise<any> {
  return cachedFetch(
    `/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`,
    60_000,
  );
}

export async function fetchCoinHistory(id: string, days = 30, vs = "usd") {
  const data = (await cachedFetch(
    `/coins/${id}/market_chart?vs_currency=${vs}&days=${days}`,
    60_000,
  )) as { prices: [number, number][] };
  return (data.prices as [number, number][]).map(([t, p]) => ({
    t,
    date: new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    price: p,
  }));
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  published: string;
}

// Browsers can't fetch RSS feeds from CoinDesk/Cointelegraph directly (no CORS),
// so we use CoinGecko's status_updates as the live source and fall back to a
// curated list of source landing pages if even that fails.
export async function fetchCryptoNews(): Promise<NewsItem[]> {
  let items: NewsItem[] = [];
  try {
    const data = (await cachedFetch(`/status_updates?per_page=30`, 5 * 60_000)) as {
      status_updates?: Array<{
        description?: string;
        created_at: string;
        project?: { id?: string; name?: string; public_notice?: string };
      }>;
    };
    items = (data.status_updates ?? []).map((u) => ({
      title: u.description?.slice(0, 160) ?? "Update",
      url:
        u.project?.public_notice ??
        `https://www.coingecko.com/en/coins/${u.project?.id ?? ""}`,
      source: u.project?.name ?? "CoinGecko",
      published: new Date(u.created_at).toISOString(),
    }));
  } catch {
    /* fall through */
  }
  if (!items.length) {
    const now = new Date().toISOString();
    items = [
      { title: "Latest crypto headlines on CoinDesk", url: "https://www.coindesk.com/", source: "CoinDesk", published: now },
      { title: "Markets & breaking news on Cointelegraph", url: "https://cointelegraph.com/", source: "Cointelegraph", published: now },
      { title: "The Block — research-driven crypto news", url: "https://www.theblock.co/", source: "The Block", published: now },
      { title: "Decrypt — daily crypto news & analysis", url: "https://decrypt.co/", source: "Decrypt", published: now },
      { title: "Bitcoin Magazine — BTC-focused coverage", url: "https://bitcoinmagazine.com/", source: "Bitcoin Magazine", published: now },
      { title: "CryptoSlate — news, prices & rankings", url: "https://cryptoslate.com/", source: "CryptoSlate", published: now },
    ];
  }
  return items.map((n) => ({ ...n, published: new Date(n.published).toLocaleString() }));
}

// ---------- Extra market data ----------

export interface GlobalStats {
  totalMarketCapUsd: number;
  totalVolumeUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptos: number;
  markets: number;
}

export async function fetchGlobal(): Promise<GlobalStats> {
  const data = (await cachedFetch(`/global`, 5 * 60_000)) as {
    data: {
      total_market_cap: Record<string, number>;
      total_volume: Record<string, number>;
      market_cap_percentage: Record<string, number>;
      market_cap_change_percentage_24h_usd: number;
      active_cryptocurrencies: number;
      markets: number;
    };
  };
  const d = data.data;
  return {
    totalMarketCapUsd: d.total_market_cap.usd,
    totalVolumeUsd: d.total_volume.usd,
    btcDominance: d.market_cap_percentage.btc,
    ethDominance: d.market_cap_percentage.eth,
    marketCapChange24h: d.market_cap_change_percentage_24h_usd,
    activeCryptos: d.active_cryptocurrencies,
    markets: d.markets,
  };
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
  price_btc: number;
}

export async function fetchTrending(): Promise<TrendingCoin[]> {
  const data = (await cachedFetch(`/search/trending`, 5 * 60_000)) as {
    coins?: Array<{ item: { id: string; name: string; symbol: string; thumb: string; market_cap_rank: number | null; price_btc: number } }>;
  };
  return (data.coins ?? []).map((c) => c.item).slice(0, 7);
}

export interface FearGreed {
  value: number;
  classification: string;
  timestamp: string;
}

// Fear & Greed Index from alternative.me (CORS-enabled, free, no key).
export async function fetchFearGreed(): Promise<FearGreed | null> {
  const key = "fng";
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < 30 * 60_000) return hit.data;
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    if (!res.ok) return hit?.data ?? null;
    const json = (await res.json()) as { data: Array<{ value: string; value_classification: string; timestamp: string }> };
    const d = json.data?.[0];
    if (!d) return hit?.data ?? null;
    const out: FearGreed = {
      value: Number(d.value),
      classification: d.value_classification,
      timestamp: new Date(Number(d.timestamp) * 1000).toISOString(),
    };
    cache.set(key, { at: now, data: out });
    return out;
  } catch {
    return hit?.data ?? null;
  }
}

export async function fetchTopMovers(): Promise<{ gainers: MarketCoin[]; losers: MarketCoin[] }> {
  // Pull top 250 by mcap and sort by 24h change.
  const coins = await fetchMarkets({ perPage: 250, page: 1 });
  const sorted = [...coins].filter((c) => typeof c.price_change_percentage_24h_in_currency === "number");
  sorted.sort(
    (a, b) =>
      (b.price_change_percentage_24h_in_currency ?? 0) -
      (a.price_change_percentage_24h_in_currency ?? 0),
  );
  return {
    gainers: sorted.slice(0, 5),
    losers: sorted.slice(-5).reverse(),
  };
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1) return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 6 });
}

export function formatLarge(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}
