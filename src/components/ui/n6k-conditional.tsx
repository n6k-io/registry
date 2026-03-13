import { useBinding } from "@n6k.io/ui";

/**
 * Conditionally renders children when a binding value is truthy.
 * @param props.when - Binding key to evaluate.
 * @param props.children - Content rendered when the binding is truthy.
 */
export function N6KConditional({
  when,
  children,
}: {
  when: string;
  children: React.ReactNode;
}) {
  const [value] = useBinding(when);
  if (!value) return null;
  return <>{children}</>;
}
