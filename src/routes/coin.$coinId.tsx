import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchCoinDetail, fetchCoinHistory, formatLarge, formatPrice } from "@/lib/coingecko";
import { summarize } from "@/lib/indicators";
import { useWatchlist } from "@/hooks/useWatchlist";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Star, ArrowLeft, TrendingUp, TrendingDown, Activity, Loader2 } from "lucide-react";

export const Route = createFileRoute("/coin/$coinId")({
  component: CoinDetail,
  head: ({ params }) => ({ meta: [{ title: `${params.coinId} — AltPulse` }] }),
});

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

function CoinDetail() {
  const { coinId } = Route.useParams();
  const [days, setDays] = useState(30);
  const { has, add, remove } = useWatchlist();

  const { data: coin, isLoading } = useQuery({
    queryKey: ["coin", coinId],
    queryFn: () => fetchCoinDetail(coinId),
    refetchInterval: 60_000,
  });

  const { data: history } = useQuery({
    queryKey: ["history", coinId, days],
    queryFn: () => fetchCoinHistory(coinId, days),
  });

  const prices = (history ?? []).map((p) => p.price);
  const signals = summarize(prices);
  const md = coin?.market_data;

  if (isLoading || !coin) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <DisclaimerBanner />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const ch24 = md?.price_change_percentage_24h ?? 0;
  const positive24 = ch24 >= 0;
  const watched = has(coin.id);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <DisclaimerBanner />
      <div className="container mx-auto px-4 py-8">
        <Link to="/markets" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to markets
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src={coin.image?.large} alt="" className="h-14 w-14 rounded-full" />
            <div>
              <h1 className="text-3xl font-bold">{coin.name} <span className="text-base font-normal uppercase text-muted-foreground">{coin.symbol}</span></h1>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-2xl">{formatPrice(md?.current_price?.usd)}</span>
                <span className={`font-medium ${positive24 ? "text-success" : "text-destructive"}`}>
                  {positive24 ? "+" : ""}{ch24.toFixed(2)}% (24h)
                </span>
              </div>
            </div>
          </div>
          <Button
            variant={watched ? "default" : "outline"}
            onClick={() => watched ? remove(coin.id) : add({ id: coin.id, symbol: coin.symbol, name: coin.name })}
            className={watched ? "bg-accent text-accent-foreground" : ""}
          >
            <Star className={`mr-2 h-4 w-4 ${watched ? "fill-current" : ""}`} />
            {watched ? "In watchlist" : "Add to watchlist"}
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Market cap" value={formatLarge(md?.market_cap?.usd)} />
          <Stat label="24h volume" value={formatLarge(md?.total_volume?.usd)} />
          <Stat label="Circulating" value={md?.circulating_supply ? Math.round(md.circulating_supply).toLocaleString() : "—"} />
          <Stat label="All-time high" value={formatPrice(md?.ath?.usd)} />
        </div>

        {/* Chart */}
        <Card className="mt-6 bg-gradient-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Price history</h2>
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <Button
                  key={r.days}
                  size="sm"
                  variant={days === r.days ? "secondary" : "ghost"}
                  onClick={() => setDays(r.days)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history ?? []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} domain={["auto", "auto"]} width={70} tickFormatter={(v) => formatPrice(v)} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => formatPrice(v)}
                />
                <Area type="monotone" dataKey="price" stroke="var(--color-primary)" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Signals */}
        <Card className="mt-6 bg-gradient-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Technical signals</h2>
            <Badge variant="outline" className="ml-2 text-xs">Not predictions</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Computed from the past {days} days. Indicators describe momentum and trend — they do not forecast prices.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SignalCard
              title="Trend (SMA 7 vs 30)"
              value={signals.trend.toUpperCase()}
              tone={signals.trend === "bullish" ? "success" : signals.trend === "bearish" ? "destructive" : "muted"}
              icon={signals.trend === "bullish" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              detail={`SMA7 ${formatPrice(signals.sma7)} · SMA30 ${formatPrice(signals.sma30)}`}
            />
            <SignalCard
              title="RSI (14)"
              value={signals.rsi != null ? signals.rsi.toFixed(1) : "—"}
              tone={signals.rsiLabel === "oversold" ? "success" : signals.rsiLabel === "overbought" ? "destructive" : "muted"}
              icon={<Activity className="h-4 w-4" />}
              detail={signals.rsiLabel.toUpperCase()}
            />
            <SignalCard
              title="24h change"
              value={`${ch24 >= 0 ? "+" : ""}${ch24.toFixed(2)}%`}
              tone={ch24 >= 0 ? "success" : "destructive"}
              icon={ch24 >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              detail="Price change last 24h"
            />
          </div>
        </Card>

        {coin.description?.en && (
          <Card className="mt-6 bg-gradient-card p-5">
            <h2 className="mb-2 font-semibold">About {coin.name}</h2>
            <div
              className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-primary"
              dangerouslySetInnerHTML={{ __html: coin.description.en.split(". ").slice(0, 4).join(". ") + "." }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-gradient-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </Card>
  );
}

function SignalCard({
  title, value, tone, icon, detail,
}: { title: string; value: string; tone: "success" | "destructive" | "muted"; icon: React.ReactNode; detail: string }) {
  const toneClass =
    tone === "success" ? "text-success border-success/30 bg-success/10"
    : tone === "destructive" ? "text-destructive border-destructive/30 bg-destructive/10"
    : "text-muted-foreground border-border bg-secondary/40";
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
        {icon} {title}
      </div>
      <div className="mt-2 font-mono text-xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-70">{detail}</div>
    </div>
  );
}
