import { cn } from "@/lib/utils";

/**
 * Section layout with a title heading and vertical spacing.
 * @param props.title - Section heading text.
 * @param props.className - Additional CSS classes for the section element.
 * @param props.children - Section content.
 */
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
