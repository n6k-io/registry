import { useState, useMemo, type ComponentType } from "react";
import { useQuery } from "@n6k.io/db/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlusIcon, XIcon } from "lucide-react";
import type { FieldDef } from "@/lib/build-query";

// --- Types ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChartComponent = ComponentType<any> & {
  fieldDefs: Record<string, FieldDef>;
  icon: ComponentType<{ className?: string }>;
};

export type Column = { name: string; type: string };
export type Pill = { expr: string };
export type ShelfState = Record<string, Pill[]>;

type ColKind = "numeric" | "date" | "string";
type ShelfRole = "dimension" | "measure" | "both";
type Cardinality = "low" | "high" | "any";

// --- Helpers ---

const NUMERIC_TYPES = new Set(["DOUBLE", "INTEGER", "BIGINT", "FLOAT", "REAL", "DECIMAL"]);
const TEMPORAL_TYPES = new Set(["DATE", "TIMESTAMP", "TIMESTAMPTZ"]);

function colKind(name: string, columns: Column[]): ColKind {
  const t = columns.find((c) => c.name === name)?.type ?? "";
  if (NUMERIC_TYPES.has(t)) return "numeric";
  if (TEMPORAL_TYPES.has(t)) return "date";
  return "string";
}

const TYPE_LABELS: Record<string, string> = {
  VARCHAR: "str", DATE: "date", TIMESTAMP: "ts",
  DOUBLE: "num", INTEGER: "int", BIGINT: "int", FLOAT: "num",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.toLowerCase();
}

const AGG_RE = /^(sum|avg|count|min|max|median)\(/i;

function isMeasure(expr: string): boolean {
  return AGG_RE.test(expr);
}

function isPillValid(pill: Pill, role: ShelfRole): boolean {
  if (role === "both") return true;
  const measure = isMeasure(pill.expr);
  return role === "dimension" ? !measure : measure;
}

function applyTemplate(template: string, col: string): string {
  return template.replace(/\{col\}/g, col);
}

// --- Transform groups ---

type TransformGroup = {
  label: string;
  role: "dimension" | "measure";
  cardinality: "low" | "high";
  templates: string[];
};

const TRANSFORM_GROUPS: Record<ColKind, TransformGroup[]> = {
  date: [
    { label: "Extraction", role: "dimension", cardinality: "low",
      templates: ["year({col})", "month({col})", "quarter({col})", "week({col})", "day({col})"] },
    { label: "Raw", role: "dimension", cardinality: "high",
      templates: ["{col}"] },
    { label: "Aggregate", role: "measure", cardinality: "low",
      templates: ["count({col})", "min({col})", "max({col})"] },
  ],
  numeric: [
    { label: "Raw", role: "dimension", cardinality: "high",
      templates: ["{col}"] },
    { label: "Aggregate", role: "measure", cardinality: "low",
      templates: ["avg({col})", "sum({col})", "min({col})", "max({col})", "count({col})", "median({col})"] },
  ],
  string: [
    { label: "Raw", role: "dimension", cardinality: "low",
      templates: ["{col}"] },
    { label: "Aggregate", role: "measure", cardinality: "low",
      templates: ["count({col})"] },
  ],
};

function getVisibleGroups(
  col: string,
  columns: Column[],
  role: ShelfRole,
  cardinality: Cardinality,
): { group: TransformGroup; dimmed: boolean }[] {
  const groups = TRANSFORM_GROUPS[colKind(col, columns)];
  const filtered = role === "both" ? groups : groups.filter((g) => g.role === role);

  const promoted: { group: TransformGroup; dimmed: boolean }[] = [];
  const demoted: { group: TransformGroup; dimmed: boolean }[] = [];

  for (const group of filtered) {
    if (cardinality === "any" || group.cardinality === cardinality) {
      promoted.push({ group, dimmed: false });
    } else {
      demoted.push({ group, dimmed: true });
    }
  }

  return [...promoted, ...demoted];
}

// --- Sub-components ---

function RoleIndicator({ role }: { role: ShelfRole }) {
  const base = "w-1.5 shrink-0 self-stretch";
  if (role === "dimension") return <div className={`${base} bg-chart-dimension`} />;
  if (role === "measure") return <div className={`${base} bg-chart-measure`} />;
  return (
    <div className={`${base} flex flex-col`}>
      <div className="flex-1 bg-chart-dimension" />
      <div className="flex-1 bg-chart-measure" />
    </div>
  );
}

function pillClassName(pill: Pill, role: ShelfRole): string {
  if (!isPillValid(pill, role))
    return "border-chart-invalid/20 bg-chart-invalid-muted text-chart-invalid-foreground";
  if (isMeasure(pill.expr))
    return "border-chart-measure/20 bg-chart-measure-muted text-chart-measure-foreground";
  return "border-chart-dimension/20 bg-chart-dimension-muted text-chart-dimension-foreground";
}

function ColumnList({
  columns,
  onPick,
}: {
  columns: Column[];
  onPick: (col: string) => void;
}) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Column
      </div>
      {columns.map((col) => (
        <button
          key={col.name}
          className="flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent"
          onClick={() => onPick(col.name)}
        >
          <span>{col.name}</span>
          <span className="text-xs text-muted-foreground">
            {typeLabel(col.type)}
          </span>
        </button>
      ))}
    </div>
  );
}

function TransformPicker({
  col,
  columns,
  role,
  cardinality,
  onPick,
}: {
  col: string;
  columns: Column[];
  role: ShelfRole;
  cardinality: Cardinality;
  onPick: (expr: string) => void;
}) {
  const visible = getVisibleGroups(col, columns, role, cardinality);
  const roleHeaderAt = new Set(
    visible
      .filter((v, i) => i === 0 || v.group.role !== visible[i - 1]?.group.role)
      .map((v) => visible.indexOf(v)),
  );

  return (
    <div className="py-1">
      {visible.map(({ group, dimmed }, i) => {
        const showRoleHeader = roleHeaderAt.has(i);
        const isDim = group.role === "dimension";

        return (
          <div key={group.label + group.role}>
            {showRoleHeader && (
              <div
                className={`mx-1 mt-1 rounded px-2 py-1 ${
                  isDim ? "bg-chart-dimension" : "bg-chart-measure"
                } ${dimmed ? "opacity-40" : ""}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  {isDim ? "Dimension" : "Measure"}
                </span>
              </div>
            )}
            <div
              className={`px-3 pb-0.5 pt-1 text-xs uppercase tracking-wider text-muted-foreground ${dimmed ? "opacity-40" : ""}`}
            >
              {group.label}
            </div>
            {group.templates.map((t) => (
              <button
                key={t}
                className={`w-full px-3 py-1.5 text-left text-sm ${
                  isDim
                    ? "text-chart-dimension-foreground hover:bg-chart-dimension-muted"
                    : "text-chart-measure-foreground hover:bg-chart-measure-muted"
                } ${dimmed ? "opacity-40" : ""}`}
                onClick={() => onPick(applyTemplate(t, col))}
              >
                {applyTemplate(t, col)}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Shelf({
  name,
  columns,
  role,
  cardinality,
  pills,
  onAdd,
  onRemove,
}: {
  name: string;
  columns: Column[];
  role: ShelfRole;
  cardinality: Cardinality;
  pills: Pill[];
  onAdd: (pill: Pill) => void;
  onRemove: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState<string | null>(null);

  function handlePick(expr: string) {
    onAdd({ expr });
    setOpen(false);
    setSelectedCol(null);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {name}
      </span>
      <div className="flex min-h-9 flex-1 items-stretch overflow-hidden rounded-md border bg-muted/40">
        <RoleIndicator role={role} />
        <div className="flex flex-1 flex-wrap items-center gap-1.5 px-2.5 py-1.5">
          {pills.map((pill, i) => (
            <Badge key={i} className={pillClassName(pill, role)}>
              {pill.expr}
              <button
                className="ml-1 -mr-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => onRemove(i)}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          <Popover
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setSelectedCol(null);
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <PlusIcon className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0">
              {!selectedCol ? (
                <ColumnList columns={columns} onPick={setSelectedCol} />
              ) : (
                <TransformPicker
                  col={selectedCol}
                  columns={columns}
                  role={role}
                  cardinality={cardinality}
                  onPick={handlePick}
                />
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

// --- Column resolution ---

function useDescribeTable(table: string) {
  const { rows, status } = useQuery(`DESCRIBE ${table}`);
  const columns = useMemo(() => {
    if (!rows?.length) return [];
    return rows.map((r: Record<string, unknown>) => ({
      name: String(r.column_name),
      type: String(r.column_type),
    }));
  }, [rows]);
  return { columns, loading: status === "loading" };
}

function FieldSelectorWithTable({
  table,
  ...rest
}: Omit<FieldSelectorProps, "columns"> & { table: string }) {
  const { columns, loading } = useDescribeTable(table);
  if (loading) return <div className="text-sm text-muted-foreground">Loading columns…</div>;
  return <FieldSelectorInner columns={columns} data={rest.data ?? table} {...rest} />;
}

// --- Main component ---

export interface FieldSelectorProps {
  data?: string;
  table?: string;
  columns?: Column[];
  charts: ChartComponent | ChartComponent[];
  defaultValues?: ShelfState;
  onChange?: (values: ShelfState, chartIndex: number) => void;
}

function getValidProps(
  fieldDefs: Record<string, FieldDef>,
  shelves: ShelfState,
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [shelf, def] of Object.entries(fieldDefs)) {
    const pills = (shelves[shelf] ?? []).filter((p) => isPillValid(p, def.role));
    pills.forEach((pill, i) => {
      output[i === 0 ? shelf : `${shelf}${i}`] = pill.expr;
    });
  }
  return output;
}

export function FieldSelector(props: FieldSelectorProps) {
  if (props.table) {
    return <FieldSelectorWithTable {...props} table={props.table} />;
  }
  if (!props.columns) {
    return <div className="text-sm text-destructive">Either table or columns is required</div>;
  }
  return <FieldSelectorInner {...props} columns={props.columns} />;
}

function FieldSelectorInner({
  data,
  columns,
  charts: chartsProp,
  defaultValues,
  onChange,
}: Omit<FieldSelectorProps, "table" | "columns"> & { columns: Column[] }) {
  const charts = Array.isArray(chartsProp) ? chartsProp : [chartsProp];
  const [activeIdx, setActiveIdx] = useState(0);
  const Chart = charts[Math.min(activeIdx, charts.length - 1)];
  const fieldDefs = Chart.fieldDefs;

  const [shelves, setShelves] = useState<ShelfState>(defaultValues ?? {});

  function switchChart(idx: number) {
    setActiveIdx(idx);
    onChange?.(shelves, idx);
  }

  function updateShelves(next: ShelfState) {
    setShelves(next);
    onChange?.(next, activeIdx);
  }

  function addPill(shelf: string, pill: Pill) {
    updateShelves({ ...shelves, [shelf]: [...(shelves[shelf] ?? []), pill] });
  }

  function removePill(shelf: string, idx: number) {
    updateShelves({
      ...shelves,
      [shelf]: (shelves[shelf] ?? []).filter((_, i) => i !== idx),
    });
  }

  const props = getValidProps(fieldDefs, shelves);
  const hasRequired = "x" in props && "y" in props;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {charts.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chart
            </span>
            <div className="flex overflow-hidden rounded-md border">
              {charts.map((chart, i) => {
                const ChartIcon = chart.icon;
                return (
                  <button
                    key={i}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                      i === activeIdx
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    } ${i > 0 ? "border-l" : ""}`}
                    onClick={() => switchChart(i)}
                  >
                    <ChartIcon className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {Object.entries(fieldDefs).map(([name, def]) => (
          <Shelf
            key={name}
            name={name}
            columns={columns}
            role={def.role}
            cardinality={def.cardinality ?? "any"}
            pills={shelves[name] ?? []}
            onAdd={(pill) => addPill(name, pill)}
            onRemove={(idx) => removePill(name, idx)}
          />
        ))}
      </div>

      {hasRequired ? (
        <Chart data={data} {...props} />
      ) : (
        <div className="rounded-md border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Add fields to x and y to render the chart
        </div>
      )}
    </div>
  );
}
