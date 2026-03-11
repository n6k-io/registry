import { useRef, useMemo } from "react";
import { useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import { useVegaChart, resolveSourceForSQL, isExpression, type LegendOrient } from "@/lib/n6k-chart-utils";

type Aggregate = "sum" | "count" | "mean";

export function N6KPieChart({
  table,
  query,
  names,
  values,
  aggregate,
  palette,
  innerRadius,
  legend,
}: {
  table?: string;
  query?: string;
  names: string;
  values?: string;
  aggregate?: Aggregate;
  palette?: string[];
  innerRadius?: number;
  legend?: LegendOrient;
}) {
  const source = resolveSourceForSQL({ table, query });
  const agg = aggregate || (values ? "sum" : "count");

  const rawSql = useMemo(() => {
    const namesExpr = isExpression(names) ? `(${names})` : `"${names}"`;
    let valueExpr: string;
    if (agg === "count") {
      valueExpr = "COUNT(*)";
    } else if (values) {
      const valCol = isExpression(values) ? `(${values})` : `"${values}"`;
      valueExpr = `${agg.toUpperCase()}(${valCol})`;
    } else {
      valueExpr = "COUNT(*)";
    }
    return `SELECT ${namesExpr} AS label, ${valueExpr} AS value FROM ${source} GROUP BY ${namesExpr}`;
  }, [source, names, values, agg]);

  const sql = useInterpolate(rawSql);
  const { rows, status, error } = useQuery(sql);
  const containerRef = useRef<HTMLDivElement>(null);

  const spec = useMemo(() => {
    const colorEnc: Record<string, unknown> = {
      field: "label",
      type: "nominal",
      ...(legend ? { legend: { orient: legend } } : {}),
    };
    if (palette) {
      colorEnc.scale = { range: palette };
    }

    return {
      mark: {
        type: "arc" as const,
        ...(innerRadius ? { innerRadius } : {}),
      },
      encoding: {
        theta: { field: "value", type: "quantitative" },
        color: colorEnc,
      },
    };
  }, [palette, innerRadius, legend]);

  useVegaChart(spec, rows, status, containerRef);

  if (status === "loading" || status === "idle") {
    return <div className="p-4 text-muted-foreground">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  return <div ref={containerRef} className="w-full" />;
}
