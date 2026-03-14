import { useState, useCallback } from "react";
import { useDuckDB } from "@n6k.io/db/react";

/**
 * DuckDB WASM test component with n6k extension loading and SQL execution.
 */
export function DuckdbTest() {
  const { conn, status, error } = useDuckDB();
  const [sql, setSql] = useState(
    "SELECT * FROM n6k('http://127.0.0.1:8000/tables/demo');",
  );
  const [results, setResults] = useState<Record<string, unknown>[] | null>(
    null,
  );
  const [queryError, setQueryError] = useState<string | null>(null);
  const [extensionLoaded, setExtensionLoaded] = useState(false);

  const loadExtension = useCallback(async () => {
    if (!conn) return;
    try {
      setQueryError(null);
      await conn.query("LOAD n6k;");
      setExtensionLoaded(true);
    } catch (e) {
      setQueryError((e as Error).message);
    }
  }, [conn]);

  const runQuery = useCallback(async () => {
    if (!conn) return;
    try {
      setQueryError(null);
      setResults(null);
      const result = await conn.query(sql);
      const rows = result
        .toArray()
        .map((r: { toJSON: () => Record<string, unknown> }) => r.toJSON());
      setResults(rows);
    } catch (e) {
      setQueryError((e as Error).message);
      setResults(null);
    }
  }, [conn, sql]);

  return (
    <div className="mx-auto max-w-3xl font-mono">
      <h2 className="mt-6 mb-4 text-xl font-bold">
        DuckDB WASM - Extension Test
      </h2>

      <div className="mb-4">
        Status:{" "}
        <span
          className={
            status === "ready"
              ? "text-green-500"
              : status === "error"
                ? "text-red-500"
                : "text-blue-400"
          }
        >
          {status}
        </span>
        {error && (
          <pre className="mt-2 overflow-x-auto rounded bg-neutral-800 p-4 text-red-500">
            {error}
          </pre>
        )}
      </div>

      {status === "ready" && (
        <>
          <div className="my-4">
            <button
              onClick={loadExtension}
              disabled={extensionLoaded}
              className="cursor-pointer rounded border-none bg-blue-800 px-4 py-2 font-mono text-neutral-300 disabled:cursor-default disabled:opacity-50"
            >
              {extensionLoaded ? "Extension Loaded" : "Load n6k Extension"}
            </button>
          </div>

          <div className="my-4">
            <input
              type="text"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runQuery()}
              className="box-border w-full rounded border border-neutral-600 bg-neutral-800 p-2 font-mono text-sm text-neutral-300"
            />
            <button
              onClick={runQuery}
              className="mt-2 cursor-pointer rounded border-none bg-blue-800 px-4 py-2 font-mono text-neutral-300"
            >
              Run SQL
            </button>
          </div>

          {queryError && (
            <pre className="overflow-x-auto rounded bg-neutral-800 p-4 text-red-500">
              {queryError}
            </pre>
          )}
          {results && (
            <pre className="overflow-x-auto rounded bg-neutral-800 p-4 whitespace-pre-wrap">
              {JSON.stringify(
                results,
                (_, v) => (typeof v === "bigint" ? Number(v) : v),
                2,
              )}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
