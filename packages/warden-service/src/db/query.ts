import { drizzle } from 'drizzle-orm/pg-proxy';
import type { PgRemoteDatabase } from 'drizzle-orm/pg-proxy';
import type { DatabaseClient, WardenDatabase } from './database.js';
import * as schema from './schema.js';

export type WardenReadDatabase = PgRemoteDatabase<typeof schema>;

const readDatabases = new WeakMap<WardenDatabase, WardenReadDatabase>();

/** Build one typed Drizzle read client over the service database boundary. */
export function getReadDatabase(database: WardenDatabase): WardenReadDatabase {
  const existing = readDatabases.get(database);
  if (existing) return existing;

  const readDatabase = getQueryDatabase(database);
  readDatabases.set(database, readDatabase);
  return readDatabase;
}

/** Bind typed queries to an existing connection, including its transaction. */
export function getQueryDatabase(database: DatabaseClient): WardenReadDatabase {
  return drizzle(async (text, params, method) => {
    const result = await database.query(text, params);
    return {
      // Postgres constructs row objects in result-column order. The proxy
      // driver needs arrays so Drizzle can map them back to typed selections.
      rows: method === 'all'
        ? result.rows.map((row) => Object.values(row))
        : result.rows,
    };
  }, { schema });
}
