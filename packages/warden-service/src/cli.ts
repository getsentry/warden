#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createDatabase } from './db/database.js';
import { getSchemaStatus, migrateDatabase } from './db/migrations.js';
import { parseServiceDatabaseEnvironment } from './environment.js';
import { createServiceToken, listServiceTokens, revokeServiceToken } from './tokens.js';
import type { ServiceRole } from './context.js';
import { runWorker } from './jobs/runner.js';
import { createTenant } from './tenants.js';
import { createMemoryJobHandlers } from './memory/handlers.js';

function databaseFromEnvironment() {
  const environment = parseServiceDatabaseEnvironment(process.env);
  return createDatabase({
    url: environment.DATABASE_URL,
    driver: environment.WARDEN_SERVICE_DATABASE_DRIVER,
    maxConnections: environment.WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS,
    statementTimeoutMs: environment.WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS,
  });
}

async function main(): Promise<void> {
  const [command, subcommand, ...rest] = process.argv.slice(2);
  const database = databaseFromEnvironment();
  try {
    if (command === 'db' && subcommand === 'migrate') {
      process.stdout.write(`${JSON.stringify(await migrateDatabase(database))}\n`);
      return;
    }
    if (command === 'db' && subcommand === 'status') {
      const status = await getSchemaStatus(database);
      process.stdout.write(`${JSON.stringify(status)}\n`);
      process.exitCode = status.ready ? 0 : 1;
      return;
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
      process.stdout.write(`Token created. Copy it now; it will not be shown again.\n${created.token}\n`);
      return;
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
      process.stdout.write(`${JSON.stringify(await listServiceTokens(database, context), null, 2)}\n`);
      return;
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
      process.stdout.write('Token revoked.\n');
      return;
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
      process.stdout.write(`Tenant ready.\n${tenantId}\n`);
      return;
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
      return;
    }
    throw new TypeError('usage: warden-service db <migrate|status> | tenant create [options] | token <create|list|revoke> [options] | worker');
  } finally {
    await database.close();
  }
}

const safeCliErrors = new Set([
  'token create requires --tenant, --name, and at least one --role',
  'invalid token role',
  'token list requires --tenant',
  'token revoke requires --tenant and --id',
  'service token not found',
  'tenant create requires --slug and --name',
  'usage: warden-service db <migrate|status> | tenant create [options] | token <create|list|revoke> [options] | worker',
]);

main().catch((error: unknown) => {
  const message = error instanceof TypeError && safeCliErrors.has(error.message)
    ? error.message
    : 'Warden service command failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
