// CoinGecko free public API — no key required.
const BASE = "https://api.coingecko.com/api/v3";

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
  const { vs = "usd", page = 1, perPage = 50, ids } = params;
  const url = new URL(`${BASE}/coins/markets`);
  url.searchParams.set("vs_currency", vs);
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "1h,24h,7d,30d");
  if (ids && ids.length) url.searchParams.set("ids", ids.join(","));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`CoinGecko markets failed: ${res.status}`);
  return res.json();
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
  const res = await fetch(`${BASE}/search?query=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  return (data.coins ?? []).slice(0, 12);
}

export async function fetchCoinDetail(id: string) {
  const res = await fetch(
    `${BASE}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`,
  );
  if (!res.ok) throw new Error(`Coin detail failed: ${res.status}`);
  return res.json();
}

export async function fetchCoinHistory(id: string, days = 30, vs = "usd") {
  const res = await fetch(
    `${BASE}/coins/${id}/market_chart?vs_currency=${vs}&days=${days}`,
  );
  if (!res.ok) throw new Error(`History failed: ${res.status}`);
  const data = await res.json();
  // data.prices: [ [ms, price], ... ]
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

export async function fetchCryptoNews(): Promise<NewsItem[]> {
  // CoinGecko status updates as a free news-ish feed
  try {
    const res = await fetch(`${BASE}/news`);
    if (res.ok) {
      const data = await res.json();
      const items = (data.data ?? []) as Array<{
        title: string;
        url: string;
        news_site: string;
        updated_at: number;
      }>;
      return items.slice(0, 20).map((n) => ({
        title: n.title,
        url: n.url,
        source: n.news_site,
        published: new Date(n.updated_at * 1000).toLocaleString(),
      }));
    }
  } catch {
    /* fall through */
  }
  // Fallback: status updates
  const res = await fetch(`${BASE}/status_updates?per_page=20`);
  if (!res.ok) throw new Error(`News failed: ${res.status}`);
  const data = await res.json();
  return (data.status_updates ?? []).map((u: any) => ({
    title: u.description?.slice(0, 140) ?? "Update",
    url: u.project?.public_notice ?? `https://www.coingecko.com/en/coins/${u.project?.id ?? ""}`,
    source: u.project?.name ?? "CoinGecko",
    published: new Date(u.created_at).toLocaleString(),
  }));
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
