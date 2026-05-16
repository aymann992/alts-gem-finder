import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  fetchGlobal,
  fetchTrending,
  fetchFearGreed,
  fetchTopMovers,
  formatLarge,
  formatPrice,
} from "@/lib/coingecko";
import { Activity, Flame, TrendingUp, TrendingDown, Gauge } from "lucide-react";

export function GlobalStatsCard() {
  const { data } = useQuery({
    queryKey: ["global"],
    queryFn: fetchGlobal,
    refetchInterval: 5 * 60_000,
  });
  const up = (data?.marketCapChange24h ?? 0) >= 0;
  return (
    <Card className="bg-gradient-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Global crypto market</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Total market cap" value={data ? formatLarge(data.totalMarketCapUsd) : "—"} />
        <Stat
          label="24h change"
          value={data ? `${up ? "+" : ""}${data.marketCapChange24h.toFixed(2)}%` : "—"}
          tone={up ? "success" : "destructive"}
        />
        <Stat label="24h volume" value={data ? formatLarge(data.totalVolumeUsd) : "—"} />
        <Stat label="BTC dominance" value={data ? `${data.btcDominance.toFixed(1)}%` : "—"} />
        <Stat label="ETH dominance" value={data ? `${data.ethDominance.toFixed(1)}%` : "—"} />
        <Stat label="Active coins" value={data ? data.activeCryptos.toLocaleString() : "—"} />
      </div>
    </Card>
  );
}

export function FearGreedCard() {
  const { data } = useQuery({
    queryKey: ["fng"],
    queryFn: fetchFearGreed,
    refetchInterval: 30 * 60_000,
  });
  const v = data?.value ?? 0;
  const tone =
    v >= 75 ? "text-success" : v >= 55 ? "text-success/80" : v >= 45 ? "text-muted-foreground" : v >= 25 ? "text-warning" : "text-destructive";
  return (
    <Card className="bg-gradient-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Fear &amp; Greed Index</h3>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" stroke="var(--color-border)" strokeWidth="10" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="currentColor"
              className={tone}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${(v / 100) * 263.9} 263.9`}
              strokeLinecap="round"
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold ${tone}`}>
            {data ? v : "—"}
          </div>
        </div>
        <div>
          <div className={`text-lg font-semibold ${tone}`}>{data?.classification ?? "Loading…"}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            0 = extreme fear, 100 = extreme greed. Sentiment indicator from alternative.me, updated daily.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function TrendingCard() {
  const { data } = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrending,
    refetchInterval: 5 * 60_000,
  });
  return (
    <Card className="bg-gradient-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">Trending searches</h3>
      </div>
      <ul className="space-y-2">
        {(data ?? []).map((c, i) => (
          <li key={c.id}>
            <Link
              to="/coin/$coinId"
              params={{ coinId: c.id }}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary"
            >
              <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
              <img src={c.thumb} alt="" className="h-6 w-6 rounded-full" />
              <span className="text-sm font-medium">{c.name}</span>
              <span className="text-xs uppercase text-muted-foreground">{c.symbol}</span>
              {c.market_cap_rank && (
                <span className="ml-auto text-xs text-muted-foreground">#{c.market_cap_rank}</span>
              )}
            </Link>
          </li>
        ))}
        {!data && <li className="text-sm text-muted-foreground">Loading…</li>}
      </ul>
    </Card>
  );
}

export function MoversCard() {
  const { data } = useQuery({
    queryKey: ["movers"],
    queryFn: fetchTopMovers,
    refetchInterval: 2 * 60_000,
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MoverList title="Top gainers (24h)" coins={data?.gainers ?? []} positive />
      <MoverList title="Top losers (24h)" coins={data?.losers ?? []} positive={false} />
    </div>
  );
}

function MoverList({ title, coins, positive }: { title: string; coins: any[]; positive: boolean }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  const tone = positive ? "text-success" : "text-destructive";
  return (
    <Card className="bg-gradient-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2">
        {coins.map((c) => {
          const ch = c.price_change_percentage_24h_in_currency ?? 0;
          return (
            <li key={c.id}>
              <Link
                to="/coin/$coinId"
                params={{ coinId: c.id }}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary"
              >
                <img src={c.image} alt="" className="h-6 w-6 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="text-xs uppercase text-muted-foreground">{c.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{formatPrice(c.current_price)}</div>
                  <div className={`text-xs font-semibold ${tone}`}>
                    {ch >= 0 ? "+" : ""}{ch.toFixed(2)}%
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {!coins.length && <li className="text-sm text-muted-foreground">Loading…</li>}
      </ul>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  const cls = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
