import { useState, useCallback } from 'react'
import { useDuckDB } from '@n6k.io/db/react'

/**
 * DuckDB WASM test component with n6k extension loading and SQL execution.
 */
export function DuckdbTest() {
  const { conn, status, error } = useDuckDB()
  const [sql, setSql] = useState("SELECT * FROM n6k('http://127.0.0.1:8000/tables/demo');")
  const [results, setResults] = useState<any[] | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [extensionLoaded, setExtensionLoaded] = useState(false)

  const loadExtension = useCallback(async () => {
    if (!conn) return
    try {
      setQueryError(null)
      await conn.query('LOAD n6k;')
      setExtensionLoaded(true)
    } catch (e: any) {
      setQueryError(e.message)
    }
  }, [conn])

  const runQuery = useCallback(async () => {
    if (!conn) return
    try {
      setQueryError(null)
      setResults(null)
      const result = await conn.query(sql)
      const rows = result.toArray().map((r: any) => r.toJSON())
      setResults(rows)
    } catch (e: any) {
      setQueryError(e.message)
      setResults(null)
    }
  }, [conn, sql])

  return (
    <div className="max-w-3xl mx-auto font-mono">
      <h2 className="text-xl font-bold mt-6 mb-4">DuckDB WASM - Extension Test</h2>

      <div className="mb-4">
        Status:{' '}
        <span className={
          status === 'ready' ? 'text-green-500' :
          status === 'error' ? 'text-red-500' :
          'text-blue-400'
        }>
          {status}
        </span>
        {error && <pre className="text-red-500 bg-neutral-800 p-4 rounded mt-2 overflow-x-auto">{error}</pre>}
      </div>

      {status === 'ready' && (
        <>
          <div className="my-4">
            <button
              onClick={loadExtension}
              disabled={extensionLoaded}
              className="px-4 py-2 bg-blue-800 text-neutral-300 border-none rounded font-mono cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {extensionLoaded ? 'Extension Loaded' : 'Load n6k Extension'}
            </button>
          </div>

          <div className="my-4">
            <input
              type="text"
              value={sql}
              onChange={e => setSql(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runQuery()}
              className="w-full p-2 font-mono text-sm bg-neutral-800 text-neutral-300 border border-neutral-600 rounded box-border"
            />
            <button
              onClick={runQuery}
              className="mt-2 px-4 py-2 bg-blue-800 text-neutral-300 border-none rounded font-mono cursor-pointer"
            >
              Run SQL
            </button>
          </div>

          {queryError && <pre className="text-red-500 bg-neutral-800 p-4 rounded overflow-x-auto">{queryError}</pre>}
          {results && (
            <pre className="bg-neutral-800 p-4 rounded overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(results, (_, v) => typeof v === 'bigint' ? Number(v) : v, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  )
}
