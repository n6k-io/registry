import { useEffect } from "react";
import { useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import { Type, Schema } from "apache-arrow";
import vegaEmbed from "vega-embed";

// --- Shared types ---

export type LegendOrient =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "none";

// --- Arrow → Vega type mapping ---

function arrowToVegaType(
  typeId: number,
): "temporal" | "quantitative" | "nominal" | "ordinal" {
  switch (typeId) {
    case Type.Timestamp:
    case Type.Date:
    case Type.DateDay:
    case Type.DateMillisecond:
    case Type.Time:
    case Type.TimeSecond:
    case Type.TimeMillisecond:
    case Type.TimeMicrosecond:
    case Type.TimeNanosecond:
      return "temporal";
    case Type.Int:
    case Type.Float:
    case Type.Decimal:
      return "quantitative";
    default:
      return "nominal";
  }
}

/**
 * Infers a Vega-Lite type string from an Arrow schema field and its chart role.
 * @param schema - Arrow schema to look up the field in.
 * @param fieldName - Name of the field in the schema.
 * @param role - Semantic role of the field (x, y, hue, etc.).
 * @returns Vega-Lite type string: "temporal", "quantitative", "nominal", or "ordinal".
 */
export function inferType(
  schema: Schema | undefined,
  fieldName: string,
  role: "x" | "y" | "y2" | "hue" | "size" | "xOffset" | "theta" | "labels",
): string {
  if (role === "hue" || role === "xOffset" || role === "labels")
    return "nominal";
  if (role === "size" || role === "theta") return "quantitative";

  if (!schema?.fields)
    return role === "y" || role === "y2" ? "quantitative" : "nominal";

  const field = schema.fields.find(
    (f: { name: string }) => f.name === fieldName,
  );
  if (!field) return role === "y" || role === "y2" ? "quantitative" : "nominal";

  return arrowToVegaType(field.typeId);
}

// --- SQL expression detection ---

/**
 * Detects whether a string is a SQL expression (vs. a plain column name).
 * @param s - String to test.
 * @returns True if the string contains characters beyond a simple identifier.
 */
export function isExpression(s: string): boolean {
  return !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

// --- Data source resolution (table | query mutex) ---

export type DataSourceProps =
  | { table: string; query?: never }
  | { query: string; table?: never };

/**
 * Resolves a table name or query prop into a full SELECT statement.
 * @param props - Object with either a table or query property.
 * @returns SQL query string.
 */
export function resolveDataSource(props: {
  table?: string;
  query?: string;
}): string {
  if (props.query) return props.query;
  if (props.table) return `SELECT * FROM ${props.table}`;
  throw new Error("Either table or query must be provided");
}

/**
 * Resolves a data source into a SQL fragment suitable for use in a FROM clause.
 * @param props - Object with either a table or query property.
 * @returns Table name or wrapped subquery alias.
 */
export function resolveSourceForSQL(props: {
  table?: string;
  query?: string;
}): string {
  if (props.table) return props.table;
  if (props.query) return `(${props.query}) AS _src`;
  throw new Error("Either table or query must be provided");
}

// --- Query builder ---

/**
 * Builds a SELECT query that aliases expression fields for chart consumption.
 * @param source - Base SQL source (table name or SELECT statement).
 * @param fields - Map of chart roles to field names or SQL expressions.
 * @returns Object with the generated SQL and a role-to-field-name map.
 */
export function buildChartQuery(
  source: string,
  fields: Record<string, string | undefined>,
): { sql: string; fieldMap: Record<string, string> } {
  const selects: string[] = [];
  const fieldMap: Record<string, string> = {};
  let aliasCounter = 0;

  for (const [role, expr] of Object.entries(fields)) {
    if (!expr) continue;
    if (isExpression(expr)) {
      const alias = `__${role}_${aliasCounter++}`;
      selects.push(`${expr} AS ${alias}`);
      fieldMap[role] = alias;
    } else {
      selects.push(`"${expr}"`);
      fieldMap[role] = expr;
    }
  }

  if (selects.length === 0) {
    return { sql: source, fieldMap };
  }

  const selectClause = selects.join(", ");
  const sql = `SELECT ${selectClause} FROM ${resolveSourceForWrapping(source)}`;
  return { sql, fieldMap };
}

function resolveSourceForWrapping(baseSQL: string): string {
  if (baseSQL.trimStart().toUpperCase().startsWith("SELECT")) {
    return `(${baseSQL}) AS _src`;
  }
  return baseSQL;
}

// --- Shared Vega chart hook ---

/**
 * React hook that renders a Vega-Lite spec into a container element.
 * @param spec - Vega-Lite specification (without data).
 * @param rows - Data rows to inject into the spec.
 * @param status - Query status string ("ready" triggers render).
 * @param containerRef - React ref to the target DOM element.
 */
function resolveThemeConfig(
  el: HTMLElement,
): Record<string, unknown> {
  const s = getComputedStyle(el);
  const fg = s.getPropertyValue("--color-foreground").trim();
  const muted = s.getPropertyValue("--color-muted-foreground").trim();
  const border = s.getPropertyValue("--color-border").trim();

  return {
    background: "transparent",
    view: { stroke: "transparent" },
    axis: {
      domainColor: border || undefined,
      gridColor: border || undefined,
      tickColor: border || undefined,
      labelColor: muted || undefined,
      titleColor: fg || undefined,
    },
    legend: {
      labelColor: muted || undefined,
      titleColor: fg || undefined,
    },
    title: { color: fg || undefined },
  };
}

export function useVegaChart(
  spec: Record<string, unknown>,
  rows: Record<string, unknown>[],
  status: string,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (status !== "ready" || !containerRef.current || rows.length === 0)
      return;

    const safeRows = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = typeof v === "bigint" ? Number(v) : v;
      }
      return out;
    });

    const fullSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      config: resolveThemeConfig(containerRef.current),
      ...spec,
      data: { values: safeRows },
    };

    vegaEmbed(containerRef.current, fullSpec as Record<string, unknown>, {
      actions: false,
      renderer: "svg",
    });
  }, [status, rows, spec, containerRef]);
}

// --- Shared chart data hook ---

/**
 * React hook that resolves a data source, builds a query, and returns chart-ready rows.
 * @param props - Data source props (table or query).
 * @param fields - Map of chart roles to field names or SQL expressions.
 * @returns Object with rows, status, error, schema, and fieldMap.
 */
export function useChartData(
  props: { table?: string; query?: string },
  fields: Record<string, string | undefined>,
) {
  const baseSQL = resolveDataSource(props);
  const hasExpressions = Object.values(fields).some(
    (f) => f && isExpression(f),
  );

  let rawQuery: string;
  let fieldMap: Record<string, string>;

  if (hasExpressions) {
    const result = buildChartQuery(baseSQL, fields);
    rawQuery = result.sql;
    fieldMap = result.fieldMap;
  } else {
    rawQuery = baseSQL;
    fieldMap = {};
    for (const [role, expr] of Object.entries(fields)) {
      if (expr) fieldMap[role] = expr;
    }
  }

  const query = useInterpolate(rawQuery);
  const { rows, status, error, schema } = useQuery(query);

  return { rows, status, error, schema, fieldMap };
}

// --- Resolve field name (handles expression aliasing) ---

/**
 * Resolves a field name through the field map, falling back to the original name.
 * @param fieldMap - Map of chart roles to resolved field names.
 * @param role - Chart role to look up.
 * @param originalField - Original field name or expression.
 * @returns Resolved field name or undefined.
 */
export function resolveField(
  fieldMap: Record<string, string>,
  role: string,
  originalField: string | undefined,
): string | undefined {
  if (!originalField) return undefined;
  return fieldMap[role] || originalField;
}

// --- Temporal axis config ---

/**
 * Determines the appropriate date format for a temporal axis based on data range.
 * @param rows - Data rows containing the temporal field.
 * @param fieldName - Name of the temporal field.
 * @returns Vega-Lite axis config object with a format string.
 */
export function temporalAxisConfig(
  rows: Record<string, unknown>[],
  fieldName: string,
): Record<string, unknown> {
  if (rows.length === 0) return {};

  const values = rows
    .map((r) => r[fieldName])
    .filter((v) => v != null)
    .map((v) => new Date(v as string | number).getTime())
    .filter((t) => !isNaN(t));

  if (values.length < 2) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  const rangeMs = max - min;

  const DAY = 86400_000;
  const YEAR = 365.25 * DAY;

  let format: string;
  if (rangeMs < DAY) {
    format = "%H:%M";
  } else if (rangeMs < YEAR) {
    format = "%b %d";
  } else if (rangeMs < 5 * YEAR) {
    format = "%b %Y";
  } else {
    format = "%Y";
  }

  return { format };
}

// --- Aggregate query builder ---

type Estimator = "mean" | "sum" | "count" | "median" | "min" | "max";
type ErrorBar = "ci" | "sd" | "se" | "pi";

/**
 * Builds a SQL aggregate query with optional error bar columns.
 * @param source - SQL FROM clause source.
 * @param x - Field or expression for the grouping axis.
 * @param y - Field or expression to aggregate.
 * @param estimator - Statistical estimator (mean, sum, count, median, min, max).
 * @param errorbar - Error bar type (ci, sd, se, pi) or null/undefined.
 * @param hue - Optional field for color sub-grouping.
 * @returns Object with the SQL string and a hasError boolean.
 */
export function buildAggregateQuery(
  source: string,
  x: string,
  y: string,
  estimator: Estimator,
  errorbar: ErrorBar | null | undefined,
  hue: string | undefined,
): { sql: string; hasError: boolean } {
  const xExpr = isExpression(x) ? `(${x})` : `"${x}"`;
  const yCol = isExpression(y) ? `(${y})` : `"${y}"`;
  const xAlias = `${xExpr} AS __x`;
  const xGroupBy = `__x`;

  const hueExpr = hue ? (isExpression(hue) ? `(${hue})` : `"${hue}"`) : null;
  const hueAlias = hue ? `${hueExpr} AS __hue` : null;
  const hueGroupBy = hue ? `__hue` : null;

  let aggExpr: string;
  switch (estimator) {
    case "mean":
      aggExpr = `AVG(${yCol})`;
      break;
    case "sum":
      aggExpr = `SUM(${yCol})`;
      break;
    case "count":
      aggExpr = `COUNT(${yCol})`;
      break;
    case "median":
      aggExpr = `MEDIAN(${yCol})`;
      break;
    case "min":
      aggExpr = `MIN(${yCol})`;
      break;
    case "max":
      aggExpr = `MAX(${yCol})`;
      break;
  }

  const selects = [xAlias, `${aggExpr} AS __value`];
  const groupBys = [xGroupBy];

  if (hueAlias) {
    selects.splice(1, 0, hueAlias);
    groupBys.push(hueGroupBy!);
  }

  let hasError = false;
  if (errorbar) {
    hasError = true;
    switch (errorbar) {
      case "sd":
        selects.push(`${aggExpr} - STDDEV(${yCol}) AS __error_lo`);
        selects.push(`${aggExpr} + STDDEV(${yCol}) AS __error_hi`);
        break;
      case "se":
        selects.push(
          `${aggExpr} - STDDEV(${yCol}) / SQRT(COUNT(${yCol})) AS __error_lo`,
        );
        selects.push(
          `${aggExpr} + STDDEV(${yCol}) / SQRT(COUNT(${yCol})) AS __error_hi`,
        );
        break;
      case "ci":
        selects.push(
          `PERCENTILE_CONT(0.025) WITHIN GROUP (ORDER BY ${yCol}) AS __error_lo`,
        );
        selects.push(
          `PERCENTILE_CONT(0.975) WITHIN GROUP (ORDER BY ${yCol}) AS __error_hi`,
        );
        break;
      case "pi":
        selects.push(
          `PERCENTILE_CONT(0.025) WITHIN GROUP (ORDER BY ${yCol}) AS __error_lo`,
        );
        selects.push(
          `PERCENTILE_CONT(0.975) WITHIN GROUP (ORDER BY ${yCol}) AS __error_hi`,
        );
        break;
    }
  }

  const sql = `SELECT ${selects.join(", ")} FROM ${source} GROUP BY ${groupBys.join(", ")}`;
  return { sql, hasError };
}
