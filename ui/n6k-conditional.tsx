import { useBinding } from "@n6k.io/ui";

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
