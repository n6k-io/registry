import { useBinding } from "@n6k.io/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Boolean toggle checkbox bound to a reactive binding.
 * @param props.label - Label text displayed next to the checkbox.
 * @param props.bind - Binding key for the boolean value.
 */
export function N6KToggle({
  label,
  bind,
}: {
  label: string;
  bind: string;
}) {
  const [value, setValue] = useBinding<boolean>(bind);

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`n6k-toggle-${bind}`}
        checked={value ?? false}
        onCheckedChange={(checked) => setValue(checked === true)}
      />
      <Label htmlFor={`n6k-toggle-${bind}`}>{label}</Label>
    </div>
  );
}
