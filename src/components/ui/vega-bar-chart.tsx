import { useRef, useMemo } from "react";
import {
  useVegaChart,
  inferType,
  temporalAxisConfig,
  type LegendOrient,
} from "@/lib/n6k-chart-utils";
import {
  useResolveData,
  isColumnName,
  type Field,
} from "@/lib/use-resolve-data";

type Estimator = "mean" | "sum" | "count" | "median" | "min" | "max";
type ErrorBar = "ci" | "sd" | "se" | "pi";

/**
 * Bar chart powered by Vega-Lite with a Field-based API.
 * @param props.data - DuckDB table or view reference. Required when fields are columns/expressions.
 * @param props.x - Field for the x-axis (column name, SQL expression, or subquery).
 * @param props.y - Field for the y-axis.
 * @param props.y2 - Optional secondary y field for range bars.
 * @param props.hue - Field used for color grouping.
 * @param props.xOffset - Field used for x-axis sub-grouping.
 * @param props.stack - Stack mode: true for stacked, "normalize" for 100% stacked.
 * @param props.aggregate - Vega-Lite aggregate transform applied to y.
 * @param props.estimator - Statistical estimator for aggregate mode (mean, sum, count, median, min, max).
 * @param props.errorbar - Error bar type displayed in aggregate mode (ci, sd, se, pi).
 * @param props.orient - Bar orientation: "v" for vertical, "h" for horizontal.
 * @param props.dodge - Whether to dodge (side-by-side) grouped bars.
 * @param props.order - Custom sort order for x-axis categories.
 * @param props.hueOrder - Custom sort order for hue categories.
 * @param props.palette - Array of CSS color strings for the color scale.
 * @param props.color - Single CSS color applied when no hue is used.
 * @param props.xTitle - Custom x-axis title.
 * @param props.yTitle - Custom y-axis title.
 * @param props.legend - Legend position or "none".
 */
export function VegaBarChart(props: {
  data?: string;
  x: Field;
  y: Field;
  y2?: Field;
  hue?: Field;
  xOffset?: Field;
  stack?: boolean | "normalize";
  aggregate?: string;
  estimator?: Estimator;
  errorbar?: ErrorBar | null;
  orient?: "v" | "h";
  dodge?: boolean;
  order?: string[];
  hueOrder?: string[];
  palette?: string[];
  color?: string;
  xTitle?: string;
  yTitle?: string;
  legend?: LegendOrient;
}) {
  const isAggregateMode = !!(props.estimator || props.errorbar);
  if (isAggregateMode) {
    return (
      <AggregateBarChart {...props} estimator={props.estimator || "mean"} />
    );
  }
  return <SimpleBarChart {...props} />;
}

// ---------------------------------------------------------------------------
// Simple (non-aggregate) bar chart
// ---------------------------------------------------------------------------

function SimpleBarChart({
  data,
  x,
  y,
  y2,
  hue,
  xOffset,
  stack,
  aggregate,
  orient,
  dodge,
  order,
  hueOrder,
  palette,
  color,
  xTitle,
  yTitle,
  legend,
}: {
  data?: string;
  x: Field;
  y: Field;
  y2?: Field;
  hue?: Field;
  xOffset?: Field;
  stack?: boolean | "normalize";
  aggregate?: string;
  orient?: "v" | "h";
  dodge?: boolean;
  order?: string[];
  hueOrder?: string[];
  palette?: string[];
  color?: string;
  xTitle?: string;
  yTitle?: string;
  legend?: LegendOrient;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { rows, schema, status, error } = useResolveData({
    data,
    dimensions: { x, y, y2, hue, xOffset },
  });

  const shouldDodge = dodge ?? (!!hue && !stack);

  const spec = useMemo(() => {
    const xType = inferType(schema, "x", "x");
    const yType = inferType(schema, "y", "y");

    const xEnc: Record<string, unknown> = {
      field: "x",
      type: xType,
      ...(xTitle ? { title: xTitle } : {}),
      ...(xType === "temporal" ? { axis: temporalAxisConfig(rows, "x") } : {}),
      ...(order ? { sort: order } : {}),
    };

    const yEnc: Record<string, unknown> = {
      field: "y",
      type: yType,
      ...(yTitle ? { title: yTitle } : {}),
      ...(aggregate ? { aggregate } : {}),
      ...(stack !== undefined ? { stack } : {}),
    };

    const isHorizontal = orient === "h";
    const encoding: Record<string, unknown> = isHorizontal
      ? { y: xEnc, x: yEnc }
      : { x: xEnc, y: yEnc };

    if (y2) {
      encoding[isHorizontal ? "x2" : "y2"] = { field: "y2" };
    }

    if (hue) {
      const colorEnc: Record<string, unknown> = {
        field: "hue",
        type: "nominal",
        ...(hueOrder ? { sort: hueOrder } : {}),
        ...(legend === "none"
          ? { legend: null }
          : legend
            ? { legend: { orient: legend } }
            : {}),
      };
      if (palette) colorEnc.scale = { range: palette };
      encoding.color = colorEnc;
    } else if (color) {
      encoding.color = { value: color };
    }

    const effectiveXOffset = xOffset
      ? "xOffset"
      : shouldDodge && hue
        ? "hue"
        : undefined;
    if (effectiveXOffset) {
      const offsetKey = isHorizontal ? "yOffset" : "xOffset";
      encoding[offsetKey] = { field: effectiveXOffset, type: "nominal" };
    }

    return { mark: { type: "bar" as const }, encoding };
  }, [
    schema,
    y2,
    hue,
    xOffset,
    stack,
    aggregate,
    orient,
    shouldDodge,
    order,
    hueOrder,
    palette,
    color,
    xTitle,
    yTitle,
    legend,
    rows,
  ]);

  useVegaChart(spec, rows, status, containerRef);

  if (status === "loading" || status === "idle") {
    return <div className="text-muted-foreground p-4">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  return <div ref={containerRef} className="w-full" />;
}

// ---------------------------------------------------------------------------
// Aggregate bar chart (estimator / errorbar)
// ---------------------------------------------------------------------------

function estimatorToSQL(estimator: Estimator, yField: string): string {
  const col = isColumnName(yField) ? `"${yField}"` : `(${yField})`;
  switch (estimator) {
    case "mean":
      return `AVG(${col})`;
    case "sum":
      return `SUM(${col})`;
    case "count":
      return `COUNT(${col})`;
    case "median":
      return `MEDIAN(${col})`;
    case "min":
      return `MIN(${col})`;
    case "max":
      return `MAX(${col})`;
  }
}

function errorbarToSQL(
  errorbar: ErrorBar,
  estimator: Estimator,
  yField: string,
): { lo: string; hi: string } {
  const col = isColumnName(yField) ? `"${yField}"` : `(${yField})`;
  const agg = estimatorToSQL(estimator, yField);
  switch (errorbar) {
    case "sd":
      return { lo: `${agg} - STDDEV(${col})`, hi: `${agg} + STDDEV(${col})` };
    case "se":
      return {
        lo: `${agg} - STDDEV(${col}) / SQRT(COUNT(${col}))`,
        hi: `${agg} + STDDEV(${col}) / SQRT(COUNT(${col}))`,
      };
    case "ci":
    case "pi":
      return {
        lo: `PERCENTILE_CONT(0.025) WITHIN GROUP (ORDER BY ${col})`,
        hi: `PERCENTILE_CONT(0.975) WITHIN GROUP (ORDER BY ${col})`,
      };
  }
}

function AggregateBarChart({
  data,
  x,
  y,
  hue,
  estimator,
  errorbar,
  orient,
  dodge,
  order,
  hueOrder,
  palette,
  color,
  stack,
  xTitle,
  yTitle,
  legend,
}: {
  data?: string;
  x: Field;
  y: Field;
  hue?: Field;
  estimator: Estimator;
  errorbar?: ErrorBar | null;
  orient?: "v" | "h";
  dodge?: boolean;
  order?: string[];
  hueOrder?: string[];
  palette?: string[];
  color?: string;
  stack?: boolean | "normalize";
  xTitle?: string;
  yTitle?: string;
  legend?: LegendOrient;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const dimensions: Record<string, string> = { x };
  if (hue) dimensions.hue = hue;

  const measures: Record<string, string> = {
    y: estimatorToSQL(estimator, y),
  };
  if (errorbar) {
    const { lo, hi } = errorbarToSQL(errorbar, estimator, y);
    measures.error_lo = lo;
    measures.error_hi = hi;
  }

  const { rows, schema, status, error } = useResolveData({
    data,
    dimensions,
    measures,
  });

  const shouldDodge = dodge ?? (!!hue && !stack);
  const hasError = !!errorbar;

  const defaultYLabel = estimator === "count" ? "count" : `${estimator}(${y})`;

  const spec = useMemo(() => {
    const xType = inferType(schema, "x", "x");

    const xEnc: Record<string, unknown> = {
      field: "x",
      type: xType,
      title: xTitle || x,
      ...(xType === "temporal" ? { axis: temporalAxisConfig(rows, "x") } : {}),
      ...(order ? { sort: order } : {}),
    };

    const yEnc: Record<string, unknown> = {
      field: "y",
      type: "quantitative",
      title: yTitle || defaultYLabel,
      ...(stack !== undefined ? { stack } : {}),
    };

    const isHorizontal = orient === "h";
    const barEncoding: Record<string, unknown> = isHorizontal
      ? { y: xEnc, x: yEnc }
      : { x: xEnc, y: yEnc };

    if (hue) {
      const colorEnc: Record<string, unknown> = {
        field: "hue",
        type: "nominal",
        title: hue,
        ...(hueOrder ? { sort: hueOrder } : {}),
        ...(legend === "none"
          ? { legend: null }
          : legend
            ? { legend: { orient: legend } }
            : {}),
      };
      if (palette) colorEnc.scale = { range: palette };
      barEncoding.color = colorEnc;
    } else if (color) {
      barEncoding.color = { value: color };
    }

    if (shouldDodge && hue) {
      const offsetKey = isHorizontal ? "yOffset" : "xOffset";
      barEncoding[offsetKey] = { field: "hue", type: "nominal" };
    }

    if (!hasError) {
      return { mark: { type: "bar" as const }, encoding: barEncoding };
    }

    const errorEncoding: Record<string, unknown> = { ...barEncoding };
    if (isHorizontal) {
      errorEncoding.x = { field: "error_lo", type: "quantitative" };
      errorEncoding.x2 = { field: "error_hi" };
    } else {
      errorEncoding.y = { field: "error_lo", type: "quantitative" };
      errorEncoding.y2 = { field: "error_hi" };
    }

    return {
      layer: [
        { mark: { type: "bar" as const }, encoding: barEncoding },
        {
          mark: { type: "rule" as const, strokeWidth: 1.5 },
          encoding: errorEncoding,
        },
      ],
    };
  }, [
    schema,
    x,
    hue,
    hasError,
    orient,
    shouldDodge,
    order,
    hueOrder,
    palette,
    color,
    stack,
    xTitle,
    yTitle,
    legend,
    defaultYLabel,
    rows,
  ]);

  useVegaChart(spec, rows, status, containerRef);

  if (status === "loading" || status === "idle") {
    return <div className="text-muted-foreground p-4">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  return <div ref={containerRef} className="w-full" />;
}
