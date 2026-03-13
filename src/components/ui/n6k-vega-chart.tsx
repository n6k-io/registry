import { useRef } from "react";
import { useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import { resolveDataSource, useVegaChart } from "@/lib/n6k-chart-utils";

/**
 * Raw Vega-Lite spec renderer with DuckDB data source.
 * @param props.table - DuckDB table name as the data source.
 * @param props.query - SQL query as the data source (mutually exclusive with table).
 * @param props.spec - Vega-Lite specification object (data is injected automatically).
 */
export function N6KVegaChart({
  table,
  query,
  spec,
}: {
  table?: string;
  query?: string;
  spec: Record<string, unknown>;
}) {
  const rawQuery = resolveDataSource({ table, query });
  const interpolated = useInterpolate(rawQuery);
  const { rows, status, error } = useQuery(interpolated);
  const containerRef = useRef<HTMLDivElement>(null);

  useVegaChart(spec, rows, status, containerRef);

  if (status === "loading" || status === "idle") {
    return <div className="text-muted-foreground p-4">Loading…</div>;
  }

  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return <div ref={containerRef} className="w-full" />;
}
