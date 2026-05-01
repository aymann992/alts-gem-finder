// Pure-math technical indicators. NOT financial advice. NOT predictions.
// These are descriptive signals derived from past price data only.

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface SignalSummary {
  rsi: number | null;
  sma7: number | null;
  sma30: number | null;
  trend: "bullish" | "bearish" | "neutral";
  rsiLabel: "oversold" | "neutral" | "overbought";
}

export function summarize(prices: number[]): SignalSummary {
  const r = rsi(prices, 14);
  const s7 = sma(prices, 7);
  const s30 = sma(prices, 30);
  let trend: SignalSummary["trend"] = "neutral";
  if (s7 != null && s30 != null) {
    if (s7 > s30 * 1.01) trend = "bullish";
    else if (s7 < s30 * 0.99) trend = "bearish";
  }
  let rsiLabel: SignalSummary["rsiLabel"] = "neutral";
  if (r != null) {
    if (r < 30) rsiLabel = "oversold";
    else if (r > 70) rsiLabel = "overbought";
  }
  return { rsi: r, sma7: s7, sma30: s30, trend, rsiLabel };
}
