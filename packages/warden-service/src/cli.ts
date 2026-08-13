#!/usr/bin/env node
import { createDatabase } from './db/database.js';
import { parseServiceDatabaseEnvironment } from './environment.js';
import { runServiceCli } from './cli-runner.js';

const safeCliErrors = new Set([
  'token create requires --tenant, --name, and at least one --role',
  'invalid token role',
  'token list requires --tenant',
  'token revoke requires --tenant and --id',
  'service token not found',
  'tenant create requires --slug and --name',
  'usage: warden-service db <migrate|status> | tenant create [options] | token <create|list|revoke> [options] | worker',
]);

async function start(): Promise<number> {
  const environment = parseServiceDatabaseEnvironment(process.env);
  const database = createDatabase({
    url: environment.DATABASE_URL,
    driver: environment.WARDEN_SERVICE_DATABASE_DRIVER,
    maxConnections: environment.WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS,
    statementTimeoutMs: environment.WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS,
  });
  return runServiceCli(process.argv.slice(2), database);
}

start().then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error: unknown) => {
  const message = error instanceof TypeError && safeCliErrors.has(error.message)
    ? error.message
    : 'Warden service command failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
