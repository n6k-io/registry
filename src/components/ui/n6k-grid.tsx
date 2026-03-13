import { cn } from "@/lib/utils";

/**
 * CSS grid layout with a custom column template.
 * @param props.columns - CSS grid-template-columns value.
 * @param props.gap - Tailwind gap class applied to the grid.
 * @param props.className - Additional CSS classes for the grid container.
 * @param props.children - Grid items.
 */
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
