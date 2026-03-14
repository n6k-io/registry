import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useResolveData, type Field } from "@/lib/use-resolve-data";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface RechartsBarChartProps {
  data?: string;
  x: Field;
  y: Field;
  hue?: Field;
  xTitle?: string;
  yTitle?: string;
  stack?: boolean;
}

export function RechartsBarChart({
  data,
  x,
  y,
  hue,
  xTitle,
  yTitle,
  stack,
}: RechartsBarChartProps) {
  const { rows, status, error } = useResolveData({
    data,
    dimensions: { x, y, hue },
  });

  // Pivot rows for Recharts: one object per x-value with hue values as keys
  const { pivoted, hueKeys, chartConfig } = useMemo(() => {
    if (!rows.length) return { pivoted: [], hueKeys: [], chartConfig: {} };

    if (!hue) {
      const config: ChartConfig = {
        y: { label: yTitle || String(y), color: PALETTE[0] },
      };
      const mapped = rows.map((r) => ({
        x: String(r.x ?? ""),
        y: r.y as number,
      }));
      return { pivoted: mapped, hueKeys: ["y"], chartConfig: config };
    }

    // Collect unique hue values preserving order
    const hueSet = new Set<string>();
    for (const r of rows) hueSet.add(String(r.hue ?? ""));
    const keys = Array.from(hueSet);

    // Build chart config with colors for each hue value
    const config: ChartConfig = {};
    for (let i = 0; i < keys.length; i++) {
      config[keys[i]] = {
        label: keys[i],
        color: PALETTE[i % PALETTE.length],
      };
    }

    // Group by x, spread hue values as separate keys
    const grouped = new Map<string, Record<string, unknown>>();
    for (const r of rows) {
      const xKey = String(r.x ?? "");
      if (!grouped.has(xKey)) grouped.set(xKey, { x: xKey });
      grouped.get(xKey)![String(r.hue ?? "")] = r.y;
    }

    return {
      pivoted: Array.from(grouped.values()),
      hueKeys: keys,
      chartConfig: config,
    };
  }, [rows, hue, y, yTitle]);

  if (status === "loading" || status === "idle") {
    return <div className="text-muted-foreground p-4">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart data={pivoted} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="x"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          label={
            xTitle
              ? { value: xTitle, position: "insideBottom", offset: -4 }
              : undefined
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          label={
            yTitle
              ? {
                  value: yTitle,
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                }
              : undefined
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {hueKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={[4, 4, 0, 0]}
            stackId={stack ? "stack" : undefined}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
