import { useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useInterpolate } from "@n6k.io/ui";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { TableHead, TableCell } from "@/components/ui/table";

const ROW_HEIGHT = 37;

// --- Pure table renderer ---

interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  maxHeight?: number | string;
  showRowCount?: boolean;
  showRowIndex?: boolean;
  className?: string;
}

export function DataTable({
  columns,
  rows,
  maxHeight = 400,
  showRowCount = true,
  showRowIndex = false,
  className,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const defs: ColumnDef<Record<string, unknown>>[] = columns.map((col) => ({
      accessorKey: col,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          {col}
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </button>
      ),
      cell: ({ getValue }) => {
        const v = getValue();
        if (v === null || v === undefined) return "";
        if (typeof v === "bigint") return Number(v).toString();
        return String(v);
      },
    }));

    if (showRowIndex) {
      defs.unshift({
        id: "_index",
        header: "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.index + 1}</span>
        ),
        enableSorting: false,
      });
    }

    return defs;
  }, [columns, showRowIndex]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableRows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const resolvedMaxHeight =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  return (
    <div className={cn("rounded-md border", className)}>
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ maxHeight: resolvedMaxHeight }}
      >
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-background [&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b hover:bg-muted/50"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {tableRows.length ? (
              <>
                <tr style={{ height: `${virtualizer.getVirtualItems()[0]?.start ?? 0}px` }} />
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = tableRows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index}
                      className="border-b hover:bg-muted/50"
                      style={{ height: `${ROW_HEIGHT}px` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </tr>
                  );
                })}
                <tr style={{ height: `${virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0)}px` }} />
              </>
            ) : (
              <tr className="border-b">
                <TableCell
                  colSpan={columnDefs.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showRowCount && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </div>
      )}
    </div>
  );
}

// --- N6KDataTable: table name + optional WHERE, queries via DuckDB ---

export function N6KDataTable({
  table: tableName,
  cols,
  where,
  maxHeight,
  showRowCount,
  showRowIndex,
  className,
}: {
  table: string;
  cols?: string[];
  where?: string;
  maxHeight?: number | string;
  showRowCount?: boolean;
  showRowIndex?: boolean;
  className?: string;
}) {
  const [whereInput, setWhereInput] = useState(where ?? "");

  const rawQuery = useMemo(() => {
    const selectCols = cols?.length ? cols.join(", ") : "*";
    const base = `SELECT ${selectCols} FROM ${tableName}`;
    const trimmed = whereInput.trim();
    return trimmed ? `${base} WHERE ${trimmed}` : base;
  }, [tableName, cols, whereInput]);

  const query = useInterpolate(rawQuery);

  const { columns, rows, status, error } = useQuery(query);

  const handleWhereKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") setWhereInput("");
    },
    [],
  );

  return (
    <div className={className}>
      <div className={cn("rounded-md border")}>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            WHERE
          </span>
          <Input
            value={whereInput}
            onChange={(e) => setWhereInput(e.target.value)}
            onKeyDown={handleWhereKeyDown}
            placeholder="e.g. status = 'active' AND age > 18"
            className="h-7 text-xs font-mono"
          />
        </div>
        {status === "error" && (
          <div className="px-3 py-2 text-xs text-red-500">{error}</div>
        )}
      </div>
      {(status === "loading" || status === "idle") && (
        <div className="p-4 text-muted-foreground">Loading…</div>
      )}
      {status === "ready" && (
        <DataTable
          columns={columns}
          rows={rows}
          maxHeight={maxHeight}
          showRowCount={showRowCount}
          showRowIndex={showRowIndex}
        />
      )}
    </div>
  );
}
