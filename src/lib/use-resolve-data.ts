import { useState, useEffect, useId, useMemo } from "react";
import { useDuckDB, useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import type { Schema } from "apache-arrow";
import { buildQuery, isSubquery, type Field } from "@/lib/build-query";

export { isColumnName, type Field } from "@/lib/build-query";

export interface ResolveDataInput {
  data?: string;
  dimensions: Record<string, Field | undefined>;
  measures?: Record<string, Field | undefined>;
}

export interface ResolveDataResult {
  rows: Record<string, unknown>[];
  query: string;
  schema: Schema<any> | undefined;
  status: "idle" | "loading" | "ready" | "error";
  error: string | undefined;
}

export function useResolveData({
  data,
  dimensions,
  measures,
}: ResolveDataInput): ResolveDataResult {
  const { conn, status: connStatus } = useDuckDB();
  const reactId = useId();
  const viewPrefix = `__rv${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Filter undefined entries
  const dims: Record<string, string> = {};
  for (const [k, v] of Object.entries(dimensions)) {
    if (v != null) dims[k] = v;
  }
  const meas: Record<string, string> = {};
  if (measures) {
    for (const [k, v] of Object.entries(measures)) {
      if (v != null) meas[k] = v;
    }
  }

  const allEntries = [...Object.entries(dims), ...Object.entries(meas)];
  const hasSubqueries = allEntries.some(([_, f]) => isSubquery(f));

  const inputKey = [...Object.entries(dims), ...Object.entries(meas)]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  // --- Subquery mode: create views, DESCRIBE, POSITIONAL JOIN ---
  const [viewSql, setViewSql] = useState<string | undefined>(undefined);
  const [viewError, setViewError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!hasSubqueries) return;
    if (connStatus !== "ready" || !conn) return;

    let cancelled = false;
    const viewNames: string[] = [];

    async function setup() {
      for (const [role, field] of allEntries) {
        if (!isSubquery(field)) {
          throw new Error(
            `All fields must be subqueries when 'data' is not provided. Field '${role}' is not a subquery.`,
          );
        }
        const name = `${viewPrefix}_${role}`;
        viewNames.push(name);
        await conn.query(
          `CREATE OR REPLACE TEMPORARY VIEW "${name}" AS ${field}`,
        );
      }

      const parts: string[] = [];
      for (const [role] of allEntries) {
        const name = `${viewPrefix}_${role}`;
        const desc = await conn.query(`DESCRIBE "${name}"`);
        const colName = desc.toArray()[0]?.toJSON()?.column_name;
        parts.push(`(SELECT "${colName}" AS "${role}" FROM "${name}")`);
      }

      const sql =
        parts.length === 1
          ? `SELECT * FROM ${parts[0]}`
          : `SELECT * FROM ${parts.join(" POSITIONAL JOIN ")}`;

      if (!cancelled) {
        setViewError(undefined);
        setViewSql(sql);
      }
    }

    setup().catch((e) => {
      if (!cancelled) {
        setViewSql(undefined);
        setViewError((e as Error).message);
      }
    });

    return () => {
      cancelled = true;
      for (const name of viewNames) {
        conn.query(`DROP VIEW IF EXISTS "${name}"`).catch(() => {});
      }
      setViewSql(undefined);
      setViewError(undefined);
    };
  }, [hasSubqueries, connStatus, inputKey]);

  // --- Build query ---
  const { rawQuery, buildError } = useMemo(() => {
    if (hasSubqueries) {
      return { rawQuery: viewSql || "", buildError: undefined };
    }
    try {
      return { rawQuery: buildQuery(data, dims, meas), buildError: undefined };
    } catch (e) {
      return { rawQuery: "", buildError: (e as Error).message };
    }
  }, [hasSubqueries, viewSql, data, inputKey]);

  const query = useInterpolate(rawQuery || "SELECT 1 WHERE false");
  const {
    rows: rawRows,
    status: qStatus,
    error: qError,
    schema,
  } = useQuery(query);

  // Convert bigint → number
  const rows = useMemo(() => {
    if (!rawRows?.length) return [];
    return rawRows.map((row: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = typeof v === "bigint" ? Number(v) : v;
      }
      return out;
    });
  }, [rawRows]);

  // --- Status resolution ---
  if (buildError) {
    return {
      rows: [],
      query: rawQuery,
      schema: undefined,
      status: "error",
      error: buildError,
    };
  }
  if (viewError) {
    return {
      rows: [],
      query: "",
      schema: undefined,
      status: "error",
      error: viewError,
    };
  }
  if (hasSubqueries && !viewSql) {
    return {
      rows: [],
      query: "",
      schema: undefined,
      status: "loading",
      error: undefined,
    };
  }

  return { rows, query, schema, status: qStatus, error: qError };
}
