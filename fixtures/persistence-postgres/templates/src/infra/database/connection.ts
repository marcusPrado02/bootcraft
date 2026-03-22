/**
 * PostgreSQL connection pool.
 *
 * Creates a single pool shared across the application lifetime.
 * Call teardown() on graceful shutdown.
 */

import pg from "pg";

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  /** Maximum number of connections in the pool (default: 10) */
  maxConnections?: number;
  /** Milliseconds a client can sit idle before being released (default: 30 000) */
  idleTimeoutMs?: number;
}

export interface DatabaseConnection {
  pool: pg.Pool;
  /** Run a health check query. Returns true if DB is reachable. */
  ping(): Promise<boolean>;
  /** Release all pool connections cleanly. */
  teardown(): Promise<void>;
}

export function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection {
  const pool = new pg.Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections ?? 10,
    idleTimeoutMillis: config.idleTimeoutMs ?? 30_000,
  });

  pool.on("error", (err) => {
    console.error("[database] Unexpected pool error:", err);
  });

  return {
    pool,

    async ping(): Promise<boolean> {
      try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        return true;
      } catch {
        return false;
      }
    },

    async teardown(): Promise<void> {
      await pool.end();
    },
  };
}
