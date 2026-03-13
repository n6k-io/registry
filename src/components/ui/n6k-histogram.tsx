import { useRef, useMemo } from "react";
import { useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import { useVegaChart, resolveSourceForSQL, isExpression } from "@/lib/n6k-chart-utils";

type Stat = "count" | "frequency" | "density" | "probability";

function buildSQL(
  source: string,
  x: string,
  bins: number,
  stat: Stat,
  binwidth?: number,
  binrange?: [number, number],
  hue?: string,
): string {
  const col = isExpression(x) ? `(${x})` : `"${x}"`;

  const boundsLo = binrange ? `${binrange[0]}` : `min(${col})`;
  const boundsHi = binrange ? `${binrange[1]}` : `max(${col})`;

  let numBins: string;
  if (binwidth) {
    numBins = `GREATEST(1, CAST(CEIL((hi - lo) / ${binwidth}) AS INTEGER))`;
  } else {
    numBins = `${bins}`;
  }
  const binExpr = `LEAST(CAST(FLOOR((${col} - lo) / ((hi - lo) / n_bins)) AS INTEGER) + 1, n_bins)`;

  const hueCol = hue ? `, "${hue}"` : "";
  const hueGroup = hue ? `, "${hue}"` : "";
  const hueSelect = hue ? `, "${hue}" AS hue` : "";

  let valueExpr: string;
  switch (stat) {
    case "frequency":
      valueExpr = "CAST(count(*) AS DOUBLE) / SUM(count(*)) OVER ()";
      break;
    case "density":
      valueExpr =
        "CAST(count(*) AS DOUBLE) / (SUM(count(*)) OVER () * (hi - lo) / n_bins)";
      break;
    case "probability":
      valueExpr = "CAST(count(*) AS DOUBLE) / SUM(count(*)) OVER ()";
      break;
    default:
      valueExpr = "count(*)";
  }

  return `WITH bounds AS (
  SELECT ${boundsLo} AS lo, ${boundsHi} AS hi FROM ${source}
),
params AS (
  SELECT lo, hi, ${numBins} AS n_bins FROM bounds
),
binned AS (
  SELECT ${binExpr} AS bin, lo, hi, n_bins${hueCol}
  FROM ${source}, params
  WHERE ${col} IS NOT NULL
)
SELECT
  lo + (bin - 1) * (hi - lo) / n_bins AS bin_start,
  lo + bin * (hi - lo) / n_bins AS bin_end,
  ${valueExpr} AS value${hueSelect}
FROM binned
GROUP BY bin, lo, hi, n_bins${hueGroup}
ORDER BY bin`;
}

/**
 * Histogram with configurable bins, statistical transforms, and hue grouping.
 * @param props.table - DuckDB table name as the data source.
 * @param props.query - SQL query as the data source (mutually exclusive with table).
 * @param props.x - Field or expression to bin along the x-axis.
 * @param props.stat - Statistic shown on the y-axis: "count", "frequency", "density", or "probability".
 * @param props.bins - Number of histogram bins.
 * @param props.binwidth - Fixed bin width (overrides bins).
 * @param props.binrange - Explicit [min, max] range for binning.
 * @param props.hue - Field used for color grouping.
 * @param props.multiple - How grouped histograms overlap: "layer", "dodge", or "stack".
 */
export function N6KHistogram({
  table,
  query,
  x,
  stat = "count",
  bins = 10,
  binwidth,
  binrange,
  hue,
  multiple = "layer",
}: {
  table?: string;
  query?: string;
  x: string;
  stat?: Stat;
  bins?: number;
  binwidth?: number;
  binrange?: [number, number];
  hue?: string;
  multiple?: "layer" | "dodge" | "stack";
}) {
  const source = resolveSourceForSQL({ table, query });

  const rawSql = useMemo(
    () => buildSQL(source, x, bins, stat, binwidth, binrange, hue),
    [source, x, bins, stat, binwidth, binrange, hue],
  );

  const sql = useInterpolate(rawSql);
  const { rows, status, error } = useQuery(sql);
  const containerRef = useRef<HTMLDivElement>(null);

  const spec = useMemo(() => {
    const encoding: Record<string, unknown> = {
      x: { field: "bin_start", type: "quantitative", bin: { binned: true } },
      x2: { field: "bin_end" },
      y: { field: "value", type: "quantitative", stack: multiple === "stack" ? true : null },
    };

    if (hue) {
      encoding.color = { field: "hue", type: "nominal" };
      if (multiple === "dodge") {
        encoding.xOffset = { field: "hue", type: "nominal" };
      }
    }

    return {
      mark: { type: "bar" as const },
      encoding,
    };
  }, [hue, multiple]);

  useVegaChart(spec, rows, status, containerRef);

  if (status === "loading" || status === "idle") {
    return <div className="p-4 text-muted-foreground">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  return <div ref={containerRef} className="w-full" />;
}
