import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchMarkets, formatLarge, formatPrice } from "@/lib/coingecko";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { CoinSearch } from "@/components/CoinSearch";
import { Sparkline } from "@/components/Sparkline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";

export const Route = createFileRoute("/markets")({
  component: Markets,
  head: () => ({ meta: [{ title: "Markets — AltPulse" }, { name: "description", content: "Live prices for thousands of cryptocurrencies." }] }),
});

function Markets() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["markets", page],
    queryFn: () => fetchMarkets({ perPage: 50, page }),
    refetchInterval: 60_000,
  });
  const { has, add, remove } = useWatchlist();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <DisclaimerBanner />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Markets</h1>
            <p className="text-sm text-muted-foreground">Live prices · refreshes every 60s</p>
          </div>
          <CoinSearch />
        </div>

        <Card className="overflow-hidden bg-gradient-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left">#</th>
                  <th className="px-3 py-3 text-left">Coin</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="hidden px-3 py-3 text-right md:table-cell">1h</th>
                  <th className="px-3 py-3 text-right">24h</th>
                  <th className="hidden px-3 py-3 text-right sm:table-cell">7d</th>
                  <th className="hidden px-3 py-3 text-right md:table-cell">Market Cap</th>
                  <th className="hidden px-3 py-3 lg:table-cell">7d chart</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} className="py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </td></tr>
                )}
                {(data ?? []).map((c) => {
                  const ch24 = c.price_change_percentage_24h_in_currency ?? 0;
                  const positive = ch24 >= 0;
                  const watched = has(c.id);
                  return (
                    <tr key={c.id} className="border-b border-border/40 transition-colors hover:bg-secondary/40">
                      <td className="px-3 py-3 text-muted-foreground">{c.market_cap_rank}</td>
                      <td className="px-3 py-3">
                        <Link to="/coin/$coinId" params={{ coinId: c.id }} className="flex items-center gap-2 font-medium hover:text-primary">
                          <img src={c.image} alt="" className="h-6 w-6 rounded-full" />
                          {c.name}
                          <span className="text-xs uppercase text-muted-foreground">{c.symbol}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{formatPrice(c.current_price)}</td>
                      <td className={`hidden px-3 py-3 text-right md:table-cell ${(c.price_change_percentage_1h_in_currency ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                        {(c.price_change_percentage_1h_in_currency ?? 0).toFixed(2)}%
                      </td>
                      <td className={`px-3 py-3 text-right ${positive ? "text-success" : "text-destructive"}`}>
                        {positive ? "+" : ""}{ch24.toFixed(2)}%
                      </td>
                      <td className={`hidden px-3 py-3 text-right sm:table-cell ${(c.price_change_percentage_7d_in_currency ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                        {(c.price_change_percentage_7d_in_currency ?? 0).toFixed(2)}%
                      </td>
                      <td className="hidden px-3 py-3 text-right text-muted-foreground md:table-cell">{formatLarge(c.market_cap)}</td>
                      <td className="hidden w-32 px-3 py-3 lg:table-cell">
                        <Sparkline data={c.sparkline_in_7d?.price ?? []} positive={positive} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => watched ? remove(c.id) : add({ id: c.id, symbol: c.symbol, name: c.name })}
                          aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                        >
                          <Star className={`h-4 w-4 ${watched ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
