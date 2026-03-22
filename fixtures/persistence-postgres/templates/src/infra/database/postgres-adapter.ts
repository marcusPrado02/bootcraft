/**
 * PostgreSQL adapter — base class for domain repository implementations.
 *
 * Provides a typed query helper that wraps pg.Pool so implementors
 * never import pg directly.
 */

import type pg from "pg";

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export abstract class PostgresAdapter {
  protected readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  protected async query<T extends object>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const result = await this.pool.query<T>(sql, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }

  protected async queryOne<T extends object>(
    sql: string,
    params?: unknown[],
  ): Promise<T | undefined> {
    const { rows } = await this.query<T>(sql, params);
    return rows[0];
  }
}
