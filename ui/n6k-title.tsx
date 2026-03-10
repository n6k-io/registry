import { useInterpolate } from "@n6k.io/ui";
import { cn } from "@/lib/utils";

export function N6KTitle({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const text = useInterpolate(children);
  return (
    <h1
      className={cn(
        "text-2xl font-bold tracking-tight text-foreground",
        className,
      )}
    >
      {text}
    </h1>
  );
}
