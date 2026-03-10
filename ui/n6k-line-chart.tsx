import { useRef, useMemo } from "react";
import { useChartData, useVegaChart, inferType, resolveField, temporalAxisConfig, type LegendOrient } from "@/lib/n6k-chart-utils";

export function N6KLineChart({
  table,
  query,
  x,
  y,
  hue,
  sort = true,
  xTitle,
  yTitle,
  legend,
}: {
  table?: string;
  query?: string;
  x: string;
  y: string;
  hue?: string;
  sort?: boolean;
  xTitle?: string;
  yTitle?: string;
  legend?: LegendOrient;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows, status, error, schema, fieldMap } = useChartData({ table, query }, { x, y, hue });

  const xField = resolveField(fieldMap, "x", x)!;
  const yField = resolveField(fieldMap, "y", y)!;
  const hueField = hue ? resolveField(fieldMap, "hue", hue) : undefined;

  const spec = useMemo(() => {
    const xType = inferType(schema, xField, "x");
    const yType = inferType(schema, yField, "y");

    const encoding: Record<string, unknown> = {
      x: {
        field: xField,
        type: xType,
        ...(xTitle ? { title: xTitle } : {}),
        ...(sort === false ? {} : { sort: null }),
        ...(xType === "temporal" ? { axis: temporalAxisConfig(rows, xField) } : {}),
      },
      y: {
        field: yField,
        type: yType,
        ...(yTitle ? { title: yTitle } : {}),
      },
    };

    if (hueField) {
      encoding.color = {
        field: hueField,
        type: "nominal",
        ...(legend ? { legend: { orient: legend } } : {}),
      };
    }

    return {
      mark: { type: "line" as const },
      encoding,
    };
  }, [schema, xField, yField, hueField, sort, rows, xTitle, yTitle]);

  useVegaChart(spec, rows, status, containerRef);

  if (status === "loading" || status === "idle") {
    return <div className="p-4 text-muted-foreground">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  return <div ref={containerRef} className="w-full" />;
}
