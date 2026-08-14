import { createHash } from 'node:crypto';
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import pg from 'pg';
import WebSocket from 'ws';
import { z } from 'zod';

export const DatabaseDriverSchema = z.enum(['neon', 'postgres']);
export type DatabaseDriver = z.infer<typeof DatabaseDriverSchema>;

export interface DatabaseOptions {
  url: string;
  driver?: DatabaseDriver;
  maxConnections?: number;
  statementTimeoutMs?: number;
}

export interface QueryResult<TRow extends Record<string, unknown>> {
  rows: TRow[];
  rowCount: number;
}

export interface DatabaseClient {
  query<TRow extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<TRow>>;
}

export interface WardenDatabase {
  readonly driver: DatabaseDriver;
  readonly maxConnections: number;
  readonly statementTimeoutMs: number;
  query<TRow extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<TRow>>;
  withClient<T>(operation: (client: DatabaseClient) => Promise<T>): Promise<T>;
  transaction<T>(operation: (client: DatabaseClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

interface StructuralClient {
  query(text: string, values?: readonly unknown[]): Promise<
    { rows: unknown[]; rowCount: number | null }
    | { rows: unknown[]; rowCount: number | null }[]
  >;
  release(): void;
}

interface StructuralPool {
  connect(): Promise<StructuralClient>;
  end(): Promise<void>;
}

const DatabaseOptionsSchema = z.object({
  url: z.string().url().refine((value) => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
    error: 'DATABASE_URL must use postgres:// or postgresql://',
  }),
  driver: DatabaseDriverSchema.default('neon'),
  maxConnections: z.number().int().min(1).max(20).default(3),
  statementTimeoutMs: z.number().int().min(100).max(120_000).default(15_000),
}).strict();

function normalizeResult<TRow extends Record<string, unknown>>(
  result: { rows: unknown[]; rowCount: number | null } | { rows: unknown[]; rowCount: number | null }[],
): QueryResult<TRow> {
  const normalized = Array.isArray(result) ? result.at(-1) ?? { rows: [], rowCount: 0 } : result;
  return {
    rows: normalized.rows as TRow[],
    rowCount: normalized.rowCount ?? normalized.rows.length,
  };
}

function databaseKey(options: Required<DatabaseOptions>): string {
  return createHash('sha256')
    .update(`${options.driver}\0${options.url}\0${options.maxConnections}\0${options.statementTimeoutMs}`)
    .digest('hex');
}

const warmDatabases = new Map<string, WardenDatabase>();

/** Create a bounded Postgres database handle without applying migrations. */
export function createDatabase(input: DatabaseOptions): WardenDatabase {
  const options = DatabaseOptionsSchema.parse(input) as Required<DatabaseOptions>;
  let pool: StructuralPool;

  if (options.driver === 'neon') {
    neonConfig.webSocketConstructor = WebSocket;
    const neonPool = new NeonPool({
      connectionString: options.url,
      max: options.maxConnections,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    pool = neonPool as unknown as StructuralPool;
  } else {
    const postgresPool = new pg.Pool({
      connectionString: options.url,
      max: options.maxConnections,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      allowExitOnIdle: true,
      application_name: 'warden-service',
    });
    pool = postgresPool as unknown as StructuralPool;
  }

  async function withClient<T>(operation: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = ${options.statementTimeoutMs}`);
      const normalized: DatabaseClient = {
        async query<TRow extends Record<string, unknown>>(text: string, values?: readonly unknown[]) {
          return normalizeResult<TRow>(await client.query(text, values));
        },
      };
      return await operation(normalized);
    } finally {
      client.release();
    }
  }

  return {
    driver: options.driver,
    maxConnections: options.maxConnections,
    statementTimeoutMs: options.statementTimeoutMs,
    withClient,
    query(text, values) {
      return withClient((client) => client.query(text, values));
    },
    transaction(operation) {
      return withClient(async (client) => {
        await client.query('BEGIN');
        try {
          const result = await operation(client);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    },
    close() {
      return pool.end();
    },
  };
}

/** Reuse one bounded pool per warm serverless instance and database configuration. */
export function getWarmDatabase(input: DatabaseOptions): WardenDatabase {
  const options = DatabaseOptionsSchema.parse(input) as Required<DatabaseOptions>;
  const key = databaseKey(options);
  const existing = warmDatabases.get(key);
  if (existing) return existing;
  const database = createDatabase(options);
  warmDatabases.set(key, database);
  return database;
}
