import { useBinding } from "@n6k.io/ui";
import { cn } from "@/lib/utils";

/**
 * Multi-select pill toggle bound to a reactive binding.
 * @param props.label - Optional label displayed before the pills.
 * @param props.options - Array of selectable option values.
 * @param props.bind - Binding key for the selected values array.
 * @param props.multi - Whether multiple pills can be active at once.
 */
export function N6KPills({
  label,
  options,
  bind,
  multi = true,
}: {
  label?: string;
  options: (string | number)[];
  bind: string;
  multi?: boolean;
}) {
  const [selected, setSelected] = useBinding<(string | number)[]>(bind);
  const current = selected ?? [];

  const toggle = (option: string | number) => {
    if (multi) {
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      setSelected(next);
    } else {
      setSelected([option]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <span className="text-muted-foreground text-sm font-medium">
          {label}
        </span>
      )}
      {options.map((option) => {
        const active = current.includes(option);
        return (
          <button
            key={String(option)}
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
              "border",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent",
            )}
          >
            {String(option)}
          </button>
        );
      })}
    </div>
  );
}
