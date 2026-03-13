import { useRef, useMemo } from "react";
import { useChartData, useVegaChart, inferType, resolveField } from "@/lib/n6k-chart-utils";

/**
 * Scatter plot with optional hue and size encoding.
 * @param props.table - DuckDB table name as the data source.
 * @param props.query - SQL query as the data source (mutually exclusive with table).
 * @param props.x - Field or expression mapped to the x-axis.
 * @param props.y - Field or expression mapped to the y-axis.
 * @param props.hue - Field used for color grouping.
 * @param props.size - Field mapped to point size.
 */
export function N6KScatterChart({
  table,
  query,
  x,
  y,
  hue,
  size,
}: {
  table?: string;
  query?: string;
  x: string;
  y: string;
  hue?: string;
  size?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows, status, error, schema, fieldMap } = useChartData({ table, query }, { x, y, hue, size });

  const xField = resolveField(fieldMap, "x", x)!;
  const yField = resolveField(fieldMap, "y", y)!;
  const hueField = hue ? resolveField(fieldMap, "hue", hue) : undefined;
  const sizeField = size ? resolveField(fieldMap, "size", size) : undefined;

  const spec = useMemo(() => {
    const xType = inferType(schema, xField, "x");
    const yType = inferType(schema, yField, "y");

    const encoding: Record<string, unknown> = {
      x: { field: xField, type: xType },
      y: { field: yField, type: yType },
    };

    if (hueField) {
      encoding.color = { field: hueField, type: "nominal" };
    }

    if (sizeField) {
      encoding.size = { field: sizeField, type: "quantitative" };
    }

    return {
      mark: { type: "point" as const },
      encoding,
    };
  }, [schema, xField, yField, hueField, sizeField]);

  useVegaChart(spec, rows, status, containerRef);

  if (status === "loading" || status === "idle") {
    return <div className="p-4 text-muted-foreground">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  return <div ref={containerRef} className="w-full" />;
}
