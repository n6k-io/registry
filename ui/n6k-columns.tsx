import { cn } from "@/lib/utils";

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
