export type Field = string | { expr: string; role: "measure" | "dimension" };

export type FieldDef = {
  role: "dimension" | "measure" | "both";
  cardinality?: "low" | "high" | "any";
};

const AGG_RE = /^(sum|avg|count|min|max|median|stddev|variance|percentile_cont|percentile_disc)\s*\(/i;

export function isAggregate(field: Field): boolean {
  if (typeof field === "object") return field.role === "measure";
  return AGG_RE.test(field.trim());
}

export function fieldExpr(field: Field): string {
  return typeof field === "object" ? field.expr : field;
}

export function isColumnName(s: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

export function isSubquery(field: Field): boolean {
  const s = fieldExpr(field);
  return s.trimStart().toUpperCase().startsWith("SELECT");
}

function fieldToSelect(role: string, expr: string): string {
  if (isColumnName(expr)) return `"${expr}" AS "${role}"`;
  return `(${expr}) AS "${role}"`;
}

export type Estimator = "mean" | "sum" | "count" | "median" | "min" | "max";
export type ErrorBar = "ci" | "sd" | "se" | "pi";

export function estimatorToSQL(estimator: Estimator, field: string): string {
  const col = isColumnName(field) ? `"${field}"` : `(${field})`;
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

export function errorbarToSQL(
  errorbar: ErrorBar,
  estimator: Estimator,
  field: string,
): { lo: string; hi: string } {
  const col = isColumnName(field) ? `"${field}"` : `(${field})`;
  const agg = estimatorToSQL(estimator, field);
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

export function buildQuery(
  data: string | undefined,
  fields: Record<string, Field>,
): string {
  const entries = Object.entries(fields);
  const hasSubqueries = entries.some(([, f]) => isSubquery(f));

  if (hasSubqueries) {
    return "";
  }

  if (!data && entries.length > 0) {
    throw new Error(
      "'data' is required when fields are columns or expressions",
    );
  }

  if (entries.length === 0) {
    return data ? `SELECT * FROM ${data}` : "";
  }

  const selects = entries.map(([role, field]) => fieldToSelect(role, fieldExpr(field)));
  let sql = `SELECT ${selects.join(", ")} FROM ${data}`;

  const hasAgg = entries.some(([, f]) => isAggregate(f));
  if (hasAgg) {
    const groupByFields = entries.filter(([, f]) => !isAggregate(f));
    if (groupByFields.length > 0) {
      sql += ` GROUP BY ${groupByFields.map(([role]) => `"${role}"`).join(", ")}`;
    }
  }

  return sql;
}
