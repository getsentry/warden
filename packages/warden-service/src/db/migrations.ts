import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseClient, WardenDatabase } from './database.js';

// This differs from the legacy session-lock key so a lock stranded by an old
// pooled deployment cannot block the transactional migrator.
const MIGRATION_LOCK_ID = 8_217_436_292;
const MIGRATIONS_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

function isUndefinedTable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '42P01';
}

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
  } catch (error) {
    if (!isUndefinedTable(error)) throw error;
    return { ready: requiredVersion === null, currentVersion: null, requiredVersion };
  }
}

/** Apply additive SQL migrations while holding a session advisory lock. */
export async function migrateDatabase(database: WardenDatabase): Promise<SchemaStatus> {
  const files = await migrationFiles();
  await database.withClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
      await ensureMigrationTable(client);
      const applied = await client.query<{ version: string }>('SELECT version FROM _warden_service_migrations');
      const appliedVersions = new Set(applied.rows.map((row) => row.version));

      for (const file of files) {
        const version = file.replace(/\.sql$/, '');
        if (appliedVersions.has(version)) continue;
        const sql = await readFile(join(MIGRATIONS_DIRECTORY, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO _warden_service_migrations (version) VALUES ($1)', [version]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
  return getSchemaStatus(database);
}
