import { cn } from "@/lib/utils";

/**
 * Equal-width column grid layout.
 * @param props.cols - Number of equal-width columns.
 * @param props.gap - Tailwind gap class applied to the grid.
 * @param props.className - Additional CSS classes for the grid container.
 * @param props.children - Column items.
 */
export function N6KColumns({
  cols = 2,
  gap = "gap-4",
  className,
  children,
}: {
  cols?: number;
  gap?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("grid", gap, className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}
