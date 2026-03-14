import { useState, useEffect, useId, useMemo } from "react";
import { useDuckDB, useQuery } from "@n6k.io/db/react";
import { useInterpolate } from "@n6k.io/ui";
import type { Schema } from "apache-arrow";
import { buildQuery, fieldExpr, isSubquery, type Field } from "@/lib/build-query";

export { isColumnName, isAggregate, fieldExpr, type Field, type FieldDef } from "@/lib/build-query";

export interface ResolveDataInput {
  data?: string;
  fields: Record<string, Field | undefined>;
}

export interface ResolveDataResult {
  rows: Record<string, unknown>[];
  query: string;
  schema: Schema | undefined;
  status: "idle" | "loading" | "ready" | "error";
  error: string | undefined;
}

export function useResolveData({
  data,
  fields,
}: ResolveDataInput): ResolveDataResult {
  const { conn, status: connStatus } = useDuckDB();
  const reactId = useId();
  const viewPrefix = `__rv${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Filter undefined entries — memoised so downstream hooks get stable refs
  const { cleaned, allEntries, hasSubqueries } = useMemo(() => {
    const c: Record<string, Field> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v != null) c[k] = v;
    }
    const all = Object.entries(c);
    return {
      cleaned: c,
      allEntries: all,
      hasSubqueries: all.some(([, f]) => isSubquery(f)),
    };
  }, [fields]);

  // --- Subquery mode: create views, DESCRIBE, POSITIONAL JOIN ---
  const [viewSql, setViewSql] = useState<string | undefined>(undefined);
  const [viewError, setViewError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!hasSubqueries) return;
    if (connStatus !== "ready" || !conn) return;

    const db = conn;
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
        await db.query(
          `CREATE OR REPLACE TEMPORARY VIEW "${name}" AS ${fieldExpr(field)}`,
        );
      }

      const parts: string[] = [];
      for (const [role] of allEntries) {
        const name = `${viewPrefix}_${role}`;
        const desc = await db.query(`DESCRIBE "${name}"`);
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
        db.query(`DROP VIEW IF EXISTS "${name}"`).catch(() => {});
      }
      setViewSql(undefined);
      setViewError(undefined);
    };
  }, [hasSubqueries, connStatus, allEntries, conn, viewPrefix]);

  // --- Build query ---
  const { rawQuery, buildError } = useMemo(() => {
    if (hasSubqueries) {
      return { rawQuery: viewSql || "", buildError: undefined };
    }
    try {
      return { rawQuery: buildQuery(data, cleaned), buildError: undefined };
    } catch (e) {
      return { rawQuery: "", buildError: (e as Error).message };
    }
  }, [hasSubqueries, viewSql, data, cleaned]);

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

  return { rows, query, schema, status: qStatus, error: qError ?? undefined };
}
