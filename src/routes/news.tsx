import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCryptoNews } from "@/lib/coingecko";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Card } from "@/components/ui/card";
import { ExternalLink, Newspaper, Loader2 } from "lucide-react";

export const Route = createFileRoute("/news")({
  component: News,
  head: () => ({ meta: [{ title: "Crypto news — AltPulse" }] }),
});

function News() {
  const { data, isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: fetchCryptoNews,
    refetchInterval: 5 * 60_000,
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <DisclaimerBanner />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Crypto news</h1>
            <p className="text-sm text-muted-foreground">Latest headlines · refreshed every 5 min</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((n, i) => (
            <a key={i} href={n.url} target="_blank" rel="noopener noreferrer">
              <Card className="bg-gradient-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold leading-snug">{n.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-secondary px-1.5 py-0.5">{n.source}</span>
                      <span>{n.published}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
