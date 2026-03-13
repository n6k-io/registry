import { useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import { cn } from "@/lib/utils";

function isSQL(s: string): boolean {
  return s.trimStart().toUpperCase().startsWith("SELECT ");
}

function resolveScalar(source: string): string {
  if (isSQL(source)) return source;
  return `SELECT * FROM ${source} LIMIT 1`;
}

function SQLValue({
  query,
  format,
}: {
  query: string;
  format?: (v: unknown) => string;
}) {
  const sql = useInterpolate(resolveScalar(query));
  const { rows, status } = useQuery(sql);

  if (status === "loading" || status === "idle") return <>…</>;
  if (status === "error") return <>—</>;

  const raw =
    rows.length > 0
      ? Object.values(rows[0] as Record<string, unknown>)[0]
      : null;
  if (raw == null) return <>—</>;

  return <>{format ? format(raw) : String(raw)}</>;
}

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
  valueFormat?: (v: unknown) => string;
  delta?: string;
  deltaFormat?: (v: unknown) => string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">
        <SQLValue query={value} format={valueFormat} />
      </span>
      {delta && <SQLDelta query={delta} format={deltaFormat} />}
    </div>
  );
}

function SQLDelta({
  query,
  format,
}: {
  query: string;
  format?: (v: unknown) => string;
}) {
  const sql = useInterpolate(resolveScalar(query));
  const { rows, status } = useQuery(sql);

  if (status === "loading" || status === "idle")
    return <span className="text-sm font-medium">…</span>;
  if (status === "error") return <span className="text-sm font-medium">—</span>;

  const raw =
    rows.length > 0
      ? Object.values(rows[0] as Record<string, unknown>)[0]
      : null;
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
