import type { WardenDatabase } from './db/database.js';

export interface CreateTenantOptions {
  slug: string;
  name: string;
}

/** Create or update one tenant namespace and return its stable ID. */
export async function createTenant(database: WardenDatabase, options: CreateTenantOptions): Promise<string> {
  const result = await database.query<{ id: string }>(`
    INSERT INTO tenants (slug, name) VALUES ($1, $2)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
    RETURNING id
  `, [options.slug, options.name]);
  const id = result.rows[0]?.id;
  if (!id) throw new Error('tenant_create_failed');
  return id;
}
