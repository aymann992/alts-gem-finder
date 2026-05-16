import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchMarkets, formatLarge, formatPrice } from "@/lib/coingecko";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { CoinSearch } from "@/components/CoinSearch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/Sparkline";
import { ArrowRight, Star, LineChart, Activity, ShieldAlert, Sparkles } from "lucide-react";
import { GlobalStatsCard, FearGreedCard, TrendingCard, MoversCard } from "@/components/MarketWidgets";
import heroImg from "@/assets/hero-crypto.jpg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "AltPulse — Live altcoin prices & signals" },
      { name: "description", content: "Free altcoin tracker with live prices, charts, RSI/MA signals, watchlists and news." },
    ],
  }),
});

function Home() {
  const { data: top } = useQuery({
    queryKey: ["markets-top"],
    queryFn: () => fetchMarkets({ perPage: 6 }),
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <DisclaimerBanner />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Updated live from CoinGecko
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Altcoin intelligence,
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                without the hype.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Real-time prices, technical signals, charts and your personal watchlist —
              for any of 10,000+ coins. No predictions, just data.
            </p>
            <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3">
              <CoinSearch />
              <div className="flex gap-2">
                <Link to="/markets">
                  <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    Explore markets <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline">
                    Create free account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<LineChart className="h-5 w-5" />}
            title="Live market data"
            text="Prices, market cap, volume and 1h/24h/7d/30d changes refreshed every minute."
          />
          <FeatureCard
            icon={<Activity className="h-5 w-5" />}
            title="Technical signals"
            text="RSI and moving-average trend signals computed from past prices. Descriptive, not predictive."
          />
          <FeatureCard
            icon={<Star className="h-5 w-5" />}
            title="Personal watchlist"
            text="Save coins to your account and access them across devices — perfect for Android via Capacitor."
          />
        </div>
      </section>

      {/* Top coins */}
      <section className="container mx-auto px-4 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Top coins right now</h2>
            <p className="text-sm text-muted-foreground">A glance at the largest markets.</p>
          </div>
          <Link to="/markets">
            <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(top ?? []).map((c) => {
            const change = c.price_change_percentage_24h_in_currency ?? 0;
            const positive = change >= 0;
            return (
              <Link to="/coin/$coinId" params={{ coinId: c.id }} key={c.id}>
                <Card className="bg-gradient-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow">
                  <div className="flex items-center gap-3">
                    <img src={c.image} alt="" className="h-9 w-9 rounded-full" />
                    <div className="flex-1">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs uppercase text-muted-foreground">{c.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold">{formatPrice(c.current_price)}</div>
                      <div className={`text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
                        {positive ? "+" : ""}{change.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-10">
                    <Sparkline data={c.sparkline_in_7d?.price ?? []} positive={positive} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>MCap {formatLarge(c.market_cap)}</span>
                    <span>Vol {formatLarge(c.total_volume)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Honesty section */}
      <section className="border-t border-border/50 bg-card/40">
        <div className="container mx-auto max-w-3xl px-4 py-14 text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-warning" />
          <h2 className="text-2xl font-bold">A note on "predictions"</h2>
          <p className="mt-3 text-muted-foreground">
            AltPulse does <strong>not</strong> predict prices. No tool can. What we provide are{" "}
            <em>technical indicators</em> (RSI, moving averages) — math computed from past prices.
            They describe momentum and trend, not the future. Crypto is volatile and risky;
            invest responsibly.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        Built with AltPulse · Data: CoinGecko · Not financial advice
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="bg-gradient-card p-6">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
