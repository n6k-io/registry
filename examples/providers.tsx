import { DuckDBProvider } from "@n6k.io/db/react";
import { BindingProvider } from "@n6k.io/ui/lib/binding-provider";
import fetchWorkerUrl from "@n6k.io/db/workers/fetch-worker?url";
import duckdbWorkerUrl from "@n6k.io/db/workers/duckdb-worker?url";

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
      duckdbOptions={{ fetchWorkerUrl, duckdbWorkerUrl }}
    >
      <BindingProvider defaults={bindings}>{children}</BindingProvider>
    </DuckDBProvider>
  );
}
