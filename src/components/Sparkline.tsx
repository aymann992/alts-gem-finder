import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface Props {
  data: number[];
  positive?: boolean;
  height?: number;
}

export function Sparkline({ data, positive = true, height = 40 }: Props) {
  if (!data?.length) return <div className="text-xs text-muted-foreground">—</div>;
  const chartData = data.map((p, i) => ({ i, p }));
  const stroke = positive ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line type="monotone" dataKey="p" stroke={stroke} strokeWidth={1.75} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
