import { useEffect } from "react";
import { useInterpolate } from "@n6k.io/ui";
import { cn } from "@/lib/utils";

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
    <div className={cn("mx-auto max-w-4xl px-6 py-8 space-y-6", className)}>
      {children}
    </div>
  );
}
