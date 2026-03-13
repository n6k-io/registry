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

export function buildQuery(
  data: string | undefined,
  dims: Record<string, string>,
  measures: Record<string, string>,
): string {
  const dimEntries = Object.entries(dims);
  const measureEntries = Object.entries(measures);
  const allEntries = [...dimEntries, ...measureEntries];
  const hasSubqueries = allEntries.some(([_, f]) => isSubquery(f));

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
