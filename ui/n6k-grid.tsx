import { cn } from "@/lib/utils";

export function N6KGrid({
  columns,
  gap = "gap-4",
  className,
  children,
}: {
  columns: string;
  gap?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("grid", gap, className)}
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  );
}
