import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="border-y border-warning/30 bg-warning/10">
      <div className="container mx-auto flex items-start gap-3 px-4 py-2.5 text-xs text-warning-foreground/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          <span className="font-semibold">Not financial advice.</span> AltPulse shows market data and
          technical signals computed from past prices. No one can predict crypto prices —
          do your own research and never invest more than you can afford to lose.
        </p>
      </div>
    </div>
  );
}
