import { DuckDBProvider } from "@n6k.io/db/react";
import { BindingProvider } from "@n6k.io/ui/lib/binding-provider";

export function ExampleProviders({
  children,
  bindings,
}: {
  children: React.ReactNode;
  bindings?: Record<string, unknown>;
}) {
  return (
    <DuckDBProvider
      databases={{ db: "http://localhost:8000/_n6k" }}
      // databases={{ db: "https://demo.n6k.app/_n6k" }}
    >
      <BindingProvider defaults={bindings}>{children}</BindingProvider>
    </DuckDBProvider>
  );
}
