import { expect, test } from "bun:test";
import duckdb from "duckdb";
import { buildQuery } from "./build-query";

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
