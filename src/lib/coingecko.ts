// Client wrappers around server functions that proxy CoinGecko.
// Server-side caching dodges browser-origin 429 rate limits.
import { cgMarkets, cgSearch, cgDetail, cgHistory, cgNews } from "@/server/coingecko.functions";

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
  return (await cgMarkets({ data: params })) as MarketCoin[];
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
  const data = (await cgSearch({ data: { q } })) as { coins?: CoinSearchResult[] };
  return (data.coins ?? []).slice(0, 12);
}

export async function fetchCoinDetail(id: string): Promise<any> {
  return await cgDetail({ data: { id } });
}

export async function fetchCoinHistory(id: string, days = 30, vs = "usd") {
  const data = (await cgHistory({ data: { id, days, vs } })) as { prices: [number, number][] };
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
  const items = (await cgNews()) as Array<{
    title: string;
    url: string;
    source: string;
    published: string;
  }>;
  return items.map((n) => ({
    ...n,
    published: new Date(n.published).toLocaleString(),
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
