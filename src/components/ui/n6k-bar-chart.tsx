import { useRef, useMemo } from "react";
import { useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import {
  useChartData,
  useVegaChart,
  inferType,
  resolveField,
  resolveSourceForSQL,
  buildAggregateQuery,
  temporalAxisConfig,
  type LegendOrient,
} from "@/lib/n6k-chart-utils";

type Estimator = "mean" | "sum" | "count" | "median" | "min" | "max";
type ErrorBar = "ci" | "sd" | "se" | "pi";

/**
 * Bar chart with aggregation, error bars, dodge, and hue support.
 * @param props.table - DuckDB table name as the data source.
 * @param props.query - SQL query as the data source (mutually exclusive with table).
 * @param props.x - Field or expression mapped to the x-axis.
 * @param props.y - Field or expression mapped to the y-axis.
 * @param props.y2 - Optional secondary y field for range bars.
 * @param props.hue - Field used for color grouping.
 * @param props.stack - Stack mode: true for stacked, "normalize" for 100% stacked.
 * @param props.aggregate - Vega-Lite aggregate transform applied to y.
 * @param props.xOffset - Field used for x-axis sub-grouping.
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
 * @param props.legend - Legend position (left, right, top, bottom, etc.) or "none".
 */
export function N6KBarChart({
  table,
  query,
  x,
  y,
  y2,
  hue,
  stack,
  aggregate,
  xOffset,
  estimator,
  errorbar,
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
  table?: string;
  query?: string;
  x: string;
  y: string;
  y2?: string;
  hue?: string;
  stack?: boolean | "normalize";
  aggregate?: string;
  xOffset?: string;
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
  const isAggregateMode = !!(estimator || errorbar);

  if (isAggregateMode) {
    return (
      <AggregateBarChart
        table={table}
        query={query}
        x={x}
        y={y}
        hue={hue}
        estimator={estimator || "mean"}
        errorbar={errorbar}
        orient={orient}
        dodge={dodge}
        order={order}
        hueOrder={hueOrder}
        palette={palette}
        color={color}
        stack={stack}
        xTitle={xTitle}
        yTitle={yTitle}
        legend={legend}
      />
    );
  }

  return (
    <SimpleBarChart
      table={table}
      query={query}
      x={x}
      y={y}
      y2={y2}
      hue={hue}
      stack={stack}
      aggregate={aggregate}
      xOffset={xOffset}
      orient={orient}
      dodge={dodge}
      order={order}
      hueOrder={hueOrder}
      palette={palette}
      color={color}
      xTitle={xTitle}
      yTitle={yTitle}
      legend={legend}
    />
  );
}

function SimpleBarChart({
  table,
  query,
  x,
  y,
  y2,
  hue,
  stack,
  aggregate,
  xOffset,
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
  table?: string;
  query?: string;
  x: string;
  y: string;
  y2?: string;
  hue?: string;
  stack?: boolean | "normalize";
  aggregate?: string;
  xOffset?: string;
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
  const { rows, status, error, schema, fieldMap } = useChartData(
    { table, query },
    { x, y, y2, hue, xOffset },
  );

  const xField = resolveField(fieldMap, "x", x)!;
  const yField = resolveField(fieldMap, "y", y)!;
  const y2Field = y2 ? resolveField(fieldMap, "y2", y2) : undefined;
  const hueField = hue ? resolveField(fieldMap, "hue", hue) : undefined;
  const xOffsetField = xOffset
    ? resolveField(fieldMap, "xOffset", xOffset)
    : undefined;

  const shouldDodge = dodge ?? (!!hueField && !stack);

  const spec = useMemo(() => {
    const xType = inferType(schema, xField, "x");
    const yType = inferType(schema, yField, "y");

    const xEnc: Record<string, unknown> = {
      field: xField,
      type: xType,
      ...(xTitle ? { title: xTitle } : {}),
      ...(xType === "temporal"
        ? { axis: temporalAxisConfig(rows, xField) }
        : {}),
      ...(order ? { sort: order } : {}),
    };

    const yEnc: Record<string, unknown> = {
      field: yField,
      type: yType,
      ...(yTitle ? { title: yTitle } : {}),
      ...(aggregate ? { aggregate } : {}),
      ...(stack !== undefined ? { stack } : {}),
    };

    const isHorizontal = orient === "h";
    const encoding: Record<string, unknown> = isHorizontal
      ? { y: xEnc, x: yEnc }
      : { x: xEnc, y: yEnc };

    if (y2Field) {
      const y2Enc = { field: y2Field };
      encoding[isHorizontal ? "x2" : "y2"] = y2Enc;
    }

    if (hueField) {
      const colorEnc: Record<string, unknown> = {
        field: hueField,
        type: "nominal",
        ...(hueOrder ? { sort: hueOrder } : {}),
        ...(legend ? { legend: { orient: legend } } : {}),
      };
      if (palette) {
        colorEnc.scale = { range: palette };
      }
      encoding.color = colorEnc;
    } else if (color) {
      encoding.color = { value: color };
    }

    const effectiveXOffset =
      xOffsetField || (shouldDodge && hueField ? hueField : undefined);
    if (effectiveXOffset) {
      const offsetKey = isHorizontal ? "yOffset" : "xOffset";
      encoding[offsetKey] = { field: effectiveXOffset, type: "nominal" };
    }

    return {
      mark: { type: "bar" as const },
      encoding,
    };
  }, [
    schema,
    xField,
    yField,
    y2Field,
    hueField,
    xOffsetField,
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

function AggregateBarChart({
  table,
  query,
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
  table?: string;
  query?: string;
  x: string;
  y: string;
  hue?: string;
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
  const source = resolveSourceForSQL({ table, query });

  const rawSql = useMemo(
    () => buildAggregateQuery(source, x, y, estimator, errorbar, hue).sql,
    [source, x, y, estimator, errorbar, hue],
  );
  const hasError = !!errorbar;

  const sql = useInterpolate(rawSql);
  const { rows, status, error, schema } = useQuery(sql);
  const containerRef = useRef<HTMLDivElement>(null);

  const xFieldName = "__x";
  const hueFieldName = hue ? "__hue" : undefined;
  const shouldDodge = dodge ?? (!!hueFieldName && !stack);

  const spec = useMemo(() => {
    const xType = inferType(schema, xFieldName, "x");

    const xEnc: Record<string, unknown> = {
      field: xFieldName,
      type: xType,
      title: xTitle || x,
      ...(xType === "temporal"
        ? { axis: temporalAxisConfig(rows, xFieldName) }
        : {}),
      ...(order ? { sort: order } : {}),
    };

    const defaultYLabel =
      estimator === "count" ? "count" : `${estimator}(${y})`;
    const yEnc: Record<string, unknown> = {
      field: "__value",
      type: "quantitative",
      title: yTitle || defaultYLabel,
      ...(stack !== undefined ? { stack } : {}),
    };

    const isHorizontal = orient === "h";

    const barEncoding: Record<string, unknown> = isHorizontal
      ? { y: xEnc, x: yEnc }
      : { x: xEnc, y: yEnc };

    if (hueFieldName) {
      const colorEnc: Record<string, unknown> = {
        field: hueFieldName,
        type: "nominal",
        title: hue,
        ...(hueOrder ? { sort: hueOrder } : {}),
        ...(legend ? { legend: { orient: legend } } : {}),
      };
      if (palette) {
        colorEnc.scale = { range: palette };
      }
      barEncoding.color = colorEnc;
    } else if (color) {
      barEncoding.color = { value: color };
    }

    if (shouldDodge && hueFieldName) {
      const offsetKey = isHorizontal ? "yOffset" : "xOffset";
      barEncoding[offsetKey] = { field: hueFieldName, type: "nominal" };
    }

    if (!hasError) {
      return { mark: { type: "bar" as const }, encoding: barEncoding };
    }

    const errorEncoding: Record<string, unknown> = {
      ...barEncoding,
    };
    if (isHorizontal) {
      errorEncoding.x = { field: "__error_lo", type: "quantitative" };
      errorEncoding.x2 = { field: "__error_hi" };
    } else {
      errorEncoding.y = { field: "__error_lo", type: "quantitative" };
      errorEncoding.y2 = { field: "__error_hi" };
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
    xFieldName,
    hueFieldName,
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
    x,
    y,
    estimator,
    hue,
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
