/**
 * Integration test helper for PostgreSQL.
 *
 * Creates an isolated schema per test suite so tests can run in parallel
 * without interfering with each other. The schema is dropped on teardown.
 *
 * Usage:
 *   const db = createTestDatabase();
 *   beforeAll(() => db.setup());
 *   afterAll(() => db.teardown());
 *   it("...", async () => { const { pool } = db; ... });
 */

import pg from "pg";

export interface TestDatabase {
  pool: pg.Pool;
  schemaName: string;
  setup(): Promise<void>;
  teardown(): Promise<void>;
}

function uniqueSchema(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTestDatabase(): TestDatabase {
  const schemaName = uniqueSchema();

  const pool = new pg.Pool({
    host: process.env["DB_HOST"] ?? "localhost",
    port: Number(process.env["DB_PORT"] ?? 5432),
    database: process.env["DB_NAME"] ?? "{{dbName}}",
    user: process.env["DB_USER"] ?? "postgres",
    password: process.env["DB_PASSWORD"] ?? "postgres",
  });

  return {
    pool,
    schemaName,

    async setup(): Promise<void> {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      await pool.query(`SET search_path TO "${schemaName}"`);
    },

    async teardown(): Promise<void> {
      await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await pool.end();
    },
  };
}
