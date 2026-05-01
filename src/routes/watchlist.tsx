import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchMarkets, formatLarge, formatPrice } from "@/lib/coingecko";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Sparkline } from "@/components/Sparkline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, X, LogIn } from "lucide-react";

export const Route = createFileRoute("/watchlist")({
  component: WatchlistPage,
  head: () => ({ meta: [{ title: "Watchlist — AltPulse" }] }),
});

function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, remove } = useWatchlist();
  const ids = items.map((i) => i.coin_id);

  const { data } = useQuery({
    queryKey: ["watchlist-markets", ids.join(",")],
    queryFn: () => fetchMarkets({ ids, perPage: Math.max(ids.length, 1) }),
    enabled: ids.length > 0,
    refetchInterval: 60_000,
  });

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <DisclaimerBanner />
        <div className="container mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <Star className="mb-4 h-12 w-12 text-accent" />
          <h1 className="text-2xl font-bold">Sign in to save coins</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a free account to track your favorite altcoins across devices.
          </p>
          <Link to="/auth" className="mt-6">
            <Button className="bg-gradient-primary text-primary-foreground">
              <LogIn className="mr-2 h-4 w-4" /> Sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <DisclaimerBanner />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Your watchlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} coins · live prices</p>

        {items.length === 0 ? (
          <Card className="mt-8 bg-gradient-card p-10 text-center">
            <Star className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Your watchlist is empty.</p>
            <Link to="/markets" className="mt-4 inline-block">
              <Button variant="outline">Browse markets</Button>
            </Link>
          </Card>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((c) => {
              const ch = c.price_change_percentage_24h_in_currency ?? 0;
              const positive = ch >= 0;
              return (
                <Card key={c.id} className="bg-gradient-card p-4">
                  <div className="flex items-center gap-3">
                    <Link to="/coin/$coinId" params={{ coinId: c.id }} className="flex flex-1 items-center gap-3">
                      <img src={c.image} alt="" className="h-9 w-9 rounded-full" />
                      <div className="flex-1">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs uppercase text-muted-foreground">{c.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">{formatPrice(c.current_price)}</div>
                        <div className={`text-xs ${positive ? "text-success" : "text-destructive"}`}>
                          {positive ? "+" : ""}{ch.toFixed(2)}%
                        </div>
                      </div>
                    </Link>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)} aria-label="Remove">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 h-10">
                    <Sparkline data={c.sparkline_in_7d?.price ?? []} positive={positive} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">MCap {formatLarge(c.market_cap)}</div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
