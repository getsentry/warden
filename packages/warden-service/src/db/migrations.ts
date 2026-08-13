import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseClient, WardenDatabase } from './database.js';

const MIGRATION_LOCK_ID = 8_217_436_291;
const MIGRATIONS_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

export interface SchemaStatus {
  ready: boolean;
  currentVersion: string | null;
  requiredVersion: string | null;
}

async function migrationFiles(): Promise<string[]> {
  return (await readdir(MIGRATIONS_DIRECTORY))
    .filter((file) => /^\d+.*\.sql$/.test(file))
    .sort();
}

async function ensureMigrationTable(client: DatabaseClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _warden_service_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/** Report migration state without mutating the database schema. */
export async function getSchemaStatus(database: WardenDatabase): Promise<SchemaStatus> {
  const files = await migrationFiles();
  const requiredVersion = files.at(-1)?.replace(/\.sql$/, '') ?? null;
  try {
    const result = await database.query<{ version: string }>(
      'SELECT version FROM _warden_service_migrations ORDER BY version DESC LIMIT 1',
    );
    const currentVersion = result.rows[0]?.version ?? null;
    return { ready: currentVersion === requiredVersion, currentVersion, requiredVersion };
  } catch {
    return { ready: requiredVersion === null, currentVersion: null, requiredVersion };
  }
}

/** Apply additive SQL migrations while holding a session advisory lock. */
export async function migrateDatabase(database: WardenDatabase): Promise<SchemaStatus> {
  const files = await migrationFiles();
  await database.withClient(async (client) => {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    try {
      await ensureMigrationTable(client);
      const applied = await client.query<{ version: string }>('SELECT version FROM _warden_service_migrations');
      const appliedVersions = new Set(applied.rows.map((row) => row.version));

      for (const file of files) {
        const version = file.replace(/\.sql$/, '');
        if (appliedVersions.has(version)) continue;
        const sql = await readFile(join(MIGRATIONS_DIRECTORY, file), 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO _warden_service_migrations (version) VALUES ($1)', [version]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    }
  });
  return getSchemaStatus(database);
}
