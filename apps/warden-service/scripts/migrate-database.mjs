import { pathToFileURL } from 'node:url';

/** Apply service migrations during production builds before Vercel promotes the deployment. */
export async function runDeployMigrations(environment, dependencies) {
  if (environment.VERCEL_ENV !== 'production') {
    dependencies.write('Skipping database migrations outside a production Vercel build.\n');
    return;
  }

  const databaseEnvironment = dependencies.parseServiceDatabaseEnvironment(environment);
  const database = dependencies.createDatabase({
    url: databaseEnvironment.DATABASE_URL,
    driver: databaseEnvironment.WARDEN_SERVICE_DATABASE_DRIVER,
    maxConnections: databaseEnvironment.WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS,
    statementTimeoutMs: databaseEnvironment.WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS,
  });

  try {
    const status = await dependencies.migrateDatabase(database);
    if (!status.ready) throw new Error('Database migrations did not reach the required version.');
    dependencies.write(`Database schema ready at ${status.currentVersion}.\n`);
  } finally {
    await database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const service = await import('@sentry/warden-service');
  await runDeployMigrations(process.env, {
    createDatabase: service.createDatabase,
    migrateDatabase: service.migrateDatabase,
    parseServiceDatabaseEnvironment: service.parseServiceDatabaseEnvironment,
    write: (message) => process.stdout.write(message),
  });
}
