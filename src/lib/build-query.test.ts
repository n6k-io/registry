import { expect, test } from "bun:test";
import duckdb from "duckdb";
import { buildQuery, estimatorToSQL, errorbarToSQL } from "./build-query";

function query(db: InstanceType<typeof duckdb.Database>, sql: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, (err: Error | null, rows: Record<string, unknown>[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

test("dimensions + measures produces correct aggregated results from DuckDB", async () => {
  const db = new duckdb.Database(":memory:");
  await query(
    db,
    `CREATE TABLE precip (month VARCHAR, year INT, precipitation DOUBLE)`,
  );
  await query(
    db,
    `INSERT INTO precip VALUES ('Jan', 2024, 40), ('Jan', 2024, 60), ('Jan', 2025, 30), ('Feb', 2024, 50)`,
  );

  const sql = buildQuery(
    "precip",
    { x: "month", hue: "year" },
    { y: "SUM(precipitation)" },
  );

  const rows = await query(db, sql);
  expect(rows).toEqual(
    expect.arrayContaining([
      { x: "Jan", hue: 2024, y: 100 },
      { x: "Jan", hue: 2025, y: 30 },
      { x: "Feb", hue: 2024, y: 50 },
    ]),
  );
  expect(rows.length).toBe(3);
});

test("estimatorToSQL produces correct aggregates", async () => {
  const db = new duckdb.Database(":memory:");
  await query(db, `CREATE TABLE vals (g VARCHAR, v DOUBLE)`);
  await query(db, `INSERT INTO vals VALUES ('a', 10), ('a', 20), ('a', 30), ('b', 100)`);

  const sql = buildQuery("vals", { g: "g" }, { y: estimatorToSQL("mean", "v") });
  const rows = await query(db, sql);
  expect(rows).toEqual(
    expect.arrayContaining([
      { g: "a", y: 20 },
      { g: "b", y: 100 },
    ]),
  );
});

test("errorbarToSQL produces lo/hi columns", async () => {
  const db = new duckdb.Database(":memory:");
  await query(db, `CREATE TABLE vals (g VARCHAR, v DOUBLE)`);
  await query(db, `INSERT INTO vals VALUES ('a', 10), ('a', 20), ('a', 30)`);

  const { lo, hi } = errorbarToSQL("sd", "mean", "v");
  const sql = buildQuery("vals", { g: "g" }, {
    y: estimatorToSQL("mean", "v"),
    lo,
    hi,
  });
  const rows = await query(db, sql);
  expect(rows.length).toBe(1);
  const row = rows[0] as { g: string; y: number; lo: number; hi: number };
  expect(row.g).toBe("a");
  expect(row.y).toBeCloseTo(20, 5);
  expect(row.lo).toBeLessThan(row.y);
  expect(row.hi).toBeGreaterThan(row.y);
});
