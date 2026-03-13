import { useQuery } from "@n6k.io/db/react";
import { cn } from "@/lib/utils";

function isSQL(s: string): boolean {
  return s.trimStart().toUpperCase().startsWith("SELECT ");
}

function SQLValue({
  query,
  format,
}: {
  query: string;
  format?: (v: any) => string;
}) {
  const { rows, status } = useQuery(query);

  if (status === "loading" || status === "idle") return <>…</>;
  if (status === "error") return <>—</>;

  const raw = rows.length > 0 ? Object.values(rows[0] as Record<string, unknown>)[0] : null;
  if (raw == null) return <>—</>;

  return <>{format ? format(raw) : String(raw)}</>;
}

/**
 * KPI metric display with optional SQL-driven value and delta indicator.
 * @param props.label - Display label for the metric.
 * @param props.value - Static text or a SQL SELECT query whose first column/row is shown.
 * @param props.valueFormat - Optional formatter applied to the resolved value.
 * @param props.delta - Static text or SQL query for the delta indicator.
 * @param props.deltaFormat - Optional formatter applied to the resolved delta.
 * @param props.className - Additional CSS classes for the root container.
 */
export function N6KMetric({
  label,
  value,
  valueFormat,
  delta,
  deltaFormat,
  className,
}: {
  label: string;
  value: string;
  valueFormat?: (v: any) => string;
  delta?: string;
  deltaFormat?: (v: any) => string;
  className?: string;
}) {
  const valueIsSQL = isSQL(value);
  const deltaIsSQL = delta ? isSQL(delta) : false;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">
        {valueIsSQL ? <SQLValue query={value} format={valueFormat} /> : value}
      </span>
      {delta && (
        <DeltaDisplay
          delta={delta}
          deltaIsSQL={deltaIsSQL}
          deltaFormat={deltaFormat}
        />
      )}
    </div>
  );
}

function DeltaDisplay({
  delta,
  deltaIsSQL,
  deltaFormat,
}: {
  delta: string;
  deltaIsSQL: boolean;
  deltaFormat?: (v: any) => string;
}) {
  if (deltaIsSQL) {
    return <SQLDelta query={delta} format={deltaFormat} />;
  }

  const numericDelta = parseFloat(delta);
  const isPositive = !isNaN(numericDelta) && numericDelta > 0;
  const isNegative = !isNaN(numericDelta) && numericDelta < 0;

  return (
    <span
      className={cn(
        "text-sm font-medium",
        isPositive && "text-green-600",
        isNegative && "text-red-600",
      )}
    >
      {isPositive && "▲ "}
      {isNegative && "▼ "}
      {delta}
    </span>
  );
}

function SQLDelta({
  query,
  format,
}: {
  query: string;
  format?: (v: any) => string;
}) {
  const { rows, status } = useQuery(query);

  if (status === "loading" || status === "idle") return <span className="text-sm font-medium">…</span>;
  if (status === "error") return <span className="text-sm font-medium">—</span>;

  const raw = rows.length > 0 ? Object.values(rows[0] as Record<string, unknown>)[0] : null;
  if (raw == null) return <span className="text-sm font-medium">—</span>;

  const num = Number(raw);
  const isPositive = !isNaN(num) && num > 0;
  const isNegative = !isNaN(num) && num < 0;
  const display = format ? format(raw) : String(raw);

  return (
    <span
      className={cn(
        "text-sm font-medium",
        isPositive && "text-green-600",
        isNegative && "text-red-600",
      )}
    >
      {isPositive && "▲ "}
      {isNegative && "▼ "}
      {display}
    </span>
  );
}
