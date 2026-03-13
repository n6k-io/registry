import { useEffect } from "react";
import { useInterpolate } from "@n6k.io/ui";
import { cn } from "@/lib/utils";

/**
 * Page layout wrapper that sets the document title via binding interpolation.
 * @param props.title - Document title string (supports binding interpolation).
 * @param props.className - Additional CSS classes for the page container.
 * @param props.children - Page content.
 */
export function N6KPage({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const interpolatedTitle = useInterpolate(title ?? "n6k");

  useEffect(() => {
    document.title = interpolatedTitle;
  }, [interpolatedTitle]);

  return (
    <div className={cn("mx-auto max-w-4xl space-y-6 px-6 py-8", className)}>
      {children}
    </div>
  );
}
