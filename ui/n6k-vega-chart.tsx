import { useRef } from "react";
import { useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import { resolveDataSource, useVegaChart } from "@/lib/n6k-chart-utils";

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
    return <div className="p-4 text-muted-foreground">Loading…</div>;
  }

  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return <div ref={containerRef} className="w-full" />;
}
