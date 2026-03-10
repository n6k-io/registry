import { cn } from "@/lib/utils";

export function N6KSection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
