import { useEffect, useState } from "react";
import { searchCoins, type CoinSearchResult } from "@/lib/coingecko";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

export function CoinSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CoinSearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchCoins(q).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search any coin (Bitcoin, SOL, PEPE...)"
          className="pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-elegant">
          {results.map((r) => (
            <Link
              key={r.id}
              to="/coin/$coinId"
              params={{ coinId: r.id }}
              className="flex items-center gap-3 px-3 py-2 hover:bg-secondary"
            >
              <img src={r.thumb} alt="" className="h-6 w-6 rounded-full" />
              <span className="font-medium">{r.name}</span>
              <span className="text-xs uppercase text-muted-foreground">{r.symbol}</span>
              {r.market_cap_rank && (
                <span className="ml-auto text-xs text-muted-foreground">#{r.market_cap_rank}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
