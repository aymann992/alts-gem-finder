import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const KEY = "altpulse:disclaimer-dismissed";

export function DisclaimerBanner() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShown(window.localStorage.getItem(KEY) !== "1");
  }, []);

  if (!shown) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShown(false);
  };

  return (
    <div className="border-b border-border/40 bg-muted/40">
      <div className="container mx-auto flex items-center gap-3 px-4 py-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="flex-1">
          <span className="font-medium text-foreground">Not financial advice.</span>{" "}
          Market data and technical signals only — do your own research.
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
