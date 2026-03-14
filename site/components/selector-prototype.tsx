import { useState, type ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlusIcon, XIcon } from "lucide-react";
import { RechartsBarChart } from "@/components/ui/recharts-bar-chart";
import { RechartsLineChart } from "@/components/ui/recharts-line-chart";
import type { FieldDef } from "@/lib/build-query";

// --- Chart component type with static metadata ---

type ChartComponent = ComponentType<Record<string, unknown>> & {
  fieldDefs: Record<string, FieldDef>;
  icon: ComponentType<{ className?: string }>;
};

const CHARTS: ChartComponent[] = [
  RechartsBarChart as unknown as ChartComponent,
  RechartsLineChart as unknown as ChartComponent,
];

// --- Mock schema ---

const COLUMNS = [
  { name: "date", type: "DATE" },
  { name: "temp_max", type: "DOUBLE" },
  { name: "temp_min", type: "DOUBLE" },
  { name: "precipitation", type: "DOUBLE" },
  { name: "wind", type: "DOUBLE" },
  { name: "weather", type: "VARCHAR" },
];

type ColKind = "numeric" | "date" | "string";
type ShelfRole = "dimension" | "measure" | "both";
type Cardinality = "low" | "high" | "any";

function colKind(name: string): ColKind {
  const c = COLUMNS.find((c) => c.name === name);
  if (c?.type === "DOUBLE" || c?.type === "INTEGER" || c?.type === "BIGINT")
    return "numeric";
  if (c?.type === "DATE" || c?.type === "TIMESTAMP") return "date";
  return "string";
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
    {
      label: "Extraction",
      role: "dimension",
      cardinality: "low",
      templates: [
        "year({col})",
        "month({col})",
        "quarter({col})",
        "week({col})",
        "day({col})",
      ],
    },
    {
      label: "Raw",
      role: "dimension",
      cardinality: "high",
      templates: ["{col}"],
    },
    {
      label: "Aggregate",
      role: "measure",
      cardinality: "low",
      templates: ["count({col})", "min({col})", "max({col})"],
    },
  ],
  numeric: [
    {
      label: "Raw",
      role: "dimension",
      cardinality: "high",
      templates: ["{col}"],
    },
    {
      label: "Aggregate",
      role: "measure",
      cardinality: "low",
      templates: [
        "avg({col})",
        "sum({col})",
        "min({col})",
        "max({col})",
        "count({col})",
        "median({col})",
      ],
    },
  ],
  string: [
    {
      label: "Raw",
      role: "dimension",
      cardinality: "low",
      templates: ["{col}"],
    },
    {
      label: "Aggregate",
      role: "measure",
      cardinality: "low",
      templates: ["count({col})"],
    },
  ],
};

function applyTemplate(template: string, col: string): string {
  return template.replace(/\{col\}/g, col);
}

function isMeasure(expr: string): boolean {
  return /^(sum|avg|count|min|max|median)\(/i.test(expr);
}

function isPillValid(pill: Pill, role: ShelfRole): boolean {
  if (role === "both") return true;
  if (role === "dimension") return !pill.measure;
  return pill.measure;
}

// --- Components ---

function RoleIndicator({ role }: { role: ShelfRole }) {
  const base = "w-1.5 shrink-0 self-stretch";
  if (role === "dimension") {
    return <div className={`${base} bg-chart-dimension`} />;
  }
  if (role === "measure") {
    return <div className={`${base} bg-chart-measure`} />;
  }
  return (
    <div className={`${base} flex flex-col`}>
      <div className="flex-1 bg-chart-dimension" />
      <div className="flex-1 bg-chart-measure" />
    </div>
  );
}

type Pill = { expr: string; measure: boolean };
type ShelfState = Record<string, Pill[]>;

function getVisibleGroups(
  col: string,
  role: ShelfRole,
  cardinality: Cardinality,
): { group: TransformGroup; dimmed: boolean }[] {
  const kind = colKind(col);
  const allGroups = TRANSFORM_GROUPS[kind];

  const roleFiltered = allGroups.filter((g) => {
    if (role === "both") return true;
    return g.role === role;
  });

  const promoted: { group: TransformGroup; dimmed: boolean }[] = [];
  const demoted: { group: TransformGroup; dimmed: boolean }[] = [];

  for (const group of roleFiltered) {
    if (cardinality === "any" || group.cardinality === cardinality) {
      promoted.push({ group, dimmed: false });
    } else {
      demoted.push({ group, dimmed: true });
    }
  }

  return [...promoted, ...demoted];
}

function TransformPicker({
  col,
  role,
  cardinality,
  onPick,
}: {
  col: string;
  role: ShelfRole;
  cardinality: Cardinality;
  onPick: (template: string) => void;
}) {
  const visible = getVisibleGroups(col, role, cardinality);

  let lastRole: string | null = null;

  return (
    <div className="py-1">
      {visible.map(({ group, dimmed }) => {
        const showRoleHeader = group.role !== lastRole;
        lastRole = group.role;

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
            {group.templates.map((t) => {
              const label = applyTemplate(t, col);
              return (
                <button
                  key={t}
                  className={`w-full px-3 py-1.5 text-left text-sm ${
                    isDim
                      ? "text-chart-dimension-foreground hover:bg-chart-dimension-muted"
                      : "text-chart-measure-foreground hover:bg-chart-measure-muted"
                  } ${dimmed ? "opacity-40" : ""}`}
                  onClick={() => onPick(t)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function pillClassName(pill: Pill, role: ShelfRole): string {
  if (!isPillValid(pill, role)) {
    return "border-chart-invalid/20 bg-chart-invalid-muted text-chart-invalid-foreground";
  }
  if (pill.measure) {
    return "border-chart-measure/20 bg-chart-measure-muted text-chart-measure-foreground";
  }
  return "border-chart-dimension/20 bg-chart-dimension-muted text-chart-dimension-foreground";
}

function Shelf({
  name,
  role,
  cardinality,
  pills,
  onAdd,
  onRemove,
}: {
  name: string;
  role: ShelfRole;
  cardinality: Cardinality;
  pills: Pill[];
  onAdd: (pill: Pill) => void;
  onRemove: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState<string | null>(null);

  function pickColumn(col: string) {
    setSelectedCol(col);
  }

  function pickTransform(template: string) {
    if (!selectedCol) return;
    const expr = applyTemplate(template, selectedCol);
    onAdd({ expr, measure: isMeasure(expr) });
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
                <div className="py-1">
                  <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Column
                  </div>
                  {COLUMNS.map((col) => (
                    <button
                      key={col.name}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent"
                      onClick={() => pickColumn(col.name)}
                    >
                      <span>{col.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {col.type === "VARCHAR"
                          ? "str"
                          : col.type === "DATE"
                            ? "date"
                            : "num"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <TransformPicker
                  col={selectedCol}
                  role={role}
                  cardinality={cardinality}
                  onPick={pickTransform}
                />
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---

function fieldDefToShelfConfig(fd: FieldDef): { role: ShelfRole; cardinality: Cardinality } {
  return {
    role: fd.role,
    cardinality: fd.cardinality ?? "any",
  };
}

export function SelectorPrototype() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeChart = CHARTS[activeIdx];
  const fieldDefs = activeChart.fieldDefs;

  const [shelves, setShelves] = useState<ShelfState>({
    x: [{ expr: "month(date)", measure: false }],
    y: [{ expr: "avg(temp_max)", measure: true }],
    hue: [],
  });

  function addPill(shelf: string, pill: Pill) {
    setShelves((s) => ({ ...s, [shelf]: [...(s[shelf] ?? []), pill] }));
  }

  function removePill(shelf: string, idx: number) {
    setShelves((s) => ({
      ...s,
      [shelf]: (s[shelf] ?? []).filter((_, i) => i !== idx),
    }));
  }

  const output: Record<string, string> = {};
  const componentName = activeChart.displayName || activeChart.name;
  for (const [shelf, def] of Object.entries(fieldDefs)) {
    const pills = shelves[shelf] ?? [];
    const config = fieldDefToShelfConfig(def);
    const validPills = pills.filter((p) => isPillValid(p, config.role));
    for (let i = 0; i < validPills.length; i++) {
      const key = i === 0 ? shelf : `${shelf}${i}`;
      output[key] = validPills[i].expr;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Field Selector</h1>
        <p className="text-sm text-muted-foreground">
          table: db.seattle_weather
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Chart
          </span>
          <div className="flex overflow-hidden rounded-md border">
            {CHARTS.map((chart, i) => {
              const ChartIcon = chart.icon;
              return (
                <button
                  key={i}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                    i === activeIdx
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  } ${i > 0 ? "border-l" : ""}`}
                  onClick={() => setActiveIdx(i)}
                >
                  <ChartIcon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>
        {Object.entries(fieldDefs).map(([name, def]) => {
          const config = fieldDefToShelfConfig(def);
          return (
            <Shelf
              key={name}
              name={name}
              role={config.role}
              cardinality={config.cardinality}
              pills={shelves[name] ?? []}
              onAdd={(pill) => addPill(name, pill)}
              onRemove={(idx) => removePill(name, idx)}
            />
          );
        })}
      </div>

      <div className="rounded-md border bg-muted/40 p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Props output
        </div>
        <pre className="text-xs text-muted-foreground">
          <code>
            {`<${componentName}\n  data="db.seattle_weather"${Object.entries(
              output,
            )
              .map(([k, v]) => `\n  ${k}="${v}"`)
              .join("")}\n/>`}
          </code>
        </pre>
      </div>
    </div>
  );
}
