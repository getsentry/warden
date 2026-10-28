import { parseArgs } from 'node:util';
import type { ServiceRole } from './context.js';
import type { WardenDatabase } from './db/database.js';
import { getSchemaStatus, migrateDatabase } from './db/migrations.js';
import { createMemoryJobHandlers } from './memory/handlers.js';
import { runWorker } from './jobs/runner.js';
import { createTenant } from './tenants.js';
import { createServiceToken, listServiceTokens, revokeServiceToken } from './tokens.js';

/** Execute one service administration command and close its database handle. */
export async function runServiceCli(
  args: readonly string[],
  database: WardenDatabase,
  write: (output: string) => void = (output) => process.stdout.write(output),
): Promise<number> {
  const [command, subcommand, ...rest] = args;
  try {
    if (command === 'db' && subcommand === 'migrate') {
      write(`${JSON.stringify(await migrateDatabase(database))}\n`);
      return 0;
    }
    if (command === 'db' && subcommand === 'status') {
      const status = await getSchemaStatus(database);
      write(`${JSON.stringify(status)}\n`);
      return status.ready ? 0 : 1;
    }
    if (command === 'token' && subcommand === 'create') {
      const { values } = parseArgs({
        args: rest,
        options: {
          tenant: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string', multiple: true },
          repository: { type: 'string', multiple: true },
          expires: { type: 'string' },
        },
        strict: true,
      });
      if (!values.tenant || !values.name || !values.role?.length) {
        throw new TypeError('token create requires --tenant, --name, and at least one --role');
      }
      const validRoles = new Set<ServiceRole>(['ingest', 'read', 'admin']);
      const roles = values.role as ServiceRole[];
      if (roles.some((role) => !validRoles.has(role))) throw new TypeError('invalid token role');
      const created = await createServiceToken(database, {
        tenantId: values.tenant,
        name: values.name,
        roles,
        repositoryAllowlist: values.repository,
        expiresAt: values.expires ? new Date(values.expires) : undefined,
      });
      write(`Token created. Copy it now; it will not be shown again.\n${created.token}\n`);
      return 0;
    }
    if (command === 'token' && subcommand === 'list') {
      const { values } = parseArgs({
        args: rest,
        options: { tenant: { type: 'string' } },
        strict: true,
      });
      if (!values.tenant) throw new TypeError('token list requires --tenant');
      const context = {
        tenantId: values.tenant,
        tokenId: 'service-cli',
        roles: ['admin'] as const,
        repositoryAllowlist: null,
      };
      write(`${JSON.stringify(await listServiceTokens(database, context), null, 2)}\n`);
      return 0;
    }
    if (command === 'token' && subcommand === 'revoke') {
      const { values } = parseArgs({
        args: rest,
        options: { tenant: { type: 'string' }, id: { type: 'string' } },
        strict: true,
      });
      if (!values.tenant || !values.id) throw new TypeError('token revoke requires --tenant and --id');
      const context = {
        tenantId: values.tenant,
        tokenId: 'service-cli',
        roles: ['admin'] as const,
        repositoryAllowlist: null,
      };
      if (!await revokeServiceToken(database, context, values.id)) throw new TypeError('service token not found');
      write('Token revoked.\n');
      return 0;
    }
    if (command === 'tenant' && subcommand === 'create') {
      const { values } = parseArgs({
        args: rest,
        options: {
          slug: { type: 'string' },
          name: { type: 'string' },
        },
        strict: true,
      });
      if (!values.slug || !values.name) throw new TypeError('tenant create requires --slug and --name');
      const tenantId = await createTenant(database, { slug: values.slug, name: values.name });
      write(`Tenant ready.\n${tenantId}\n`);
      return 0;
    }
    if (command === 'worker') {
      const controller = new AbortController();
      const stop = () => controller.abort();
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
      try {
        await runWorker(database, createMemoryJobHandlers(database), { signal: controller.signal });
      } finally {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
      }
      return 0;
    }
    throw new TypeError('usage: warden-service db <migrate|status> | tenant create [options] | token <create|list|revoke> [options] | worker');
  } finally {
    await database.close();
  }
}
