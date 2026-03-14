export type Field = string;

export function isColumnName(s: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

export function isSubquery(s: string): boolean {
  return s.trimStart().toUpperCase().startsWith("SELECT");
}

function fieldToSelect(role: string, field: string): string {
  if (isColumnName(field)) return `"${field}" AS "${role}"`;
  return `(${field}) AS "${role}"`;
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
  dims: Record<string, string>,
  measures: Record<string, string>,
): string {
  const dimEntries = Object.entries(dims);
  const measureEntries = Object.entries(measures);
  const allEntries = [...dimEntries, ...measureEntries];
  const hasSubqueries = allEntries.some(([, f]) => isSubquery(f));

  if (hasSubqueries) {
    return "";
  }

  if (!data && allEntries.length > 0) {
    throw new Error(
      "'data' is required when fields are columns or expressions",
    );
  }

  if (allEntries.length === 0) {
    return data ? `SELECT * FROM ${data}` : "";
  }

  const selects = allEntries.map(([role, field]) => fieldToSelect(role, field));
  let sql = `SELECT ${selects.join(", ")} FROM ${data}`;

  if (measureEntries.length > 0 && dimEntries.length > 0) {
    sql += ` GROUP BY ${dimEntries.map(([role]) => `"${role}"`).join(", ")}`;
  }

  return sql;
}
