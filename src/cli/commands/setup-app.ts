/**
 * Setup GitHub App command.
 * Creates a GitHub App via the manifest flow for Warden to post as a custom bot.
 */

import { randomBytes } from 'node:crypto';
import chalk from 'chalk';
import type { SetupAppOptions } from '../args.js';
import type { Reporter } from '../output/reporter.js';
import { getGitHubRepoUrl } from '../git.js';
import { buildManifest } from './setup-app/manifest.js';
import { startCallbackServer } from './setup-app/server.js';
import { openBrowser } from './setup-app/browser.js';
import { exchangeCodeForCredentials } from './setup-app/credentials.js';

/**
 * Generate a secure random state token for CSRF protection.
 */
function generateState(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Build the GitHub URL for creating an app from manifest.
 */
function buildGitHubUrl(manifest: object, state: string, org?: string): string {
  const manifestJson = JSON.stringify(manifest);
  const encodedManifest = encodeURIComponent(manifestJson);

  if (org) {
    return `https://github.com/organizations/${org}/settings/apps/new?manifest=${encodedManifest}&state=${state}`;
  }
  return `https://github.com/settings/apps/new?manifest=${encodedManifest}&state=${state}`;
}

/**
 * Run the setup-app command.
 */
export async function runSetupApp(options: SetupAppOptions, reporter: Reporter): Promise<number> {
  const { port, timeout, org, name, open } = options;
  const timeoutMs = timeout * 1000;

  // Header
  reporter.bold('SETUP GITHUB APP');
  reporter.blank();

  // Generate state for CSRF protection
  const state = generateState();

  // Build manifest
  const manifest = buildManifest({ name, port });

  // Build GitHub URL
  const githubUrl = buildGitHubUrl(manifest, state, org);

  // Start local callback server
  reporter.step(`Starting local server on http://localhost:${port}...`);

  const serverHandle = startCallbackServer({
    port,
    expectedState: state,
    timeoutMs,
  });

  // Handle server errors (e.g., port already in use)
  serverHandle.server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      reporter.error(`Port ${port} is already in use. Try a different port with --port <number>`);
    } else {
      reporter.error(`Server error: ${error.message}`);
    }
    process.exit(1);
  });

  try {
    // Open browser or show URL
    if (open) {
      reporter.step('Opening browser to GitHub...');
      try {
        await openBrowser(githubUrl);
      } catch {
        reporter.warning('Could not open browser automatically.');
        reporter.blank();
        reporter.text('Please open this URL manually:');
        reporter.text(chalk.cyan(githubUrl));
      }
    } else {
      reporter.blank();
      reporter.text('Open this URL in your browser:');
      reporter.text(chalk.cyan(githubUrl));
    }

    reporter.blank();
    reporter.text('Waiting for callback... (Ctrl+C to cancel)');
    reporter.blank();

    // Wait for callback
    const { code } = await serverHandle.waitForCallback;

    // Exchange code for credentials
    reporter.step('Exchanging code for credentials...');
    const credentials = await exchangeCodeForCredentials(code);

    // Success!
    reporter.blank();
    reporter.success('GitHub App created!');
    reporter.blank();
    reporter.text(`  App ID:    ${chalk.cyan(credentials.id)}`);
    reporter.text(`  App Name:  ${chalk.cyan(credentials.name)}`);
    reporter.text(`  App URL:   ${chalk.cyan(credentials.htmlUrl)}`);
    reporter.blank();

    // Show secrets to add
    reporter.bold('Add these secrets to your repository:');
    reporter.blank();
    reporter.text(`  ${chalk.cyan('WARDEN_APP_ID')}          ${credentials.id}`);
    reporter.text(`  ${chalk.cyan('WARDEN_PRIVATE_KEY')}     (shown below)`);
    reporter.blank();

    // Show private key
    reporter.bold('Private Key:');
    reporter.blank();
    reporter.text(chalk.dim(credentials.pem));
    reporter.blank();

    // Next steps
    const githubRepoUrl = getGitHubRepoUrl(process.cwd());
    reporter.bold('Next steps:');
    if (githubRepoUrl) {
      reporter.text(`  1. Add secrets at: ${chalk.cyan(githubRepoUrl + '/settings/secrets/actions')}`);
    } else {
      reporter.text(`  1. Add secrets to your repository settings`);
    }
    reporter.text(`  2. Update your workflow to use the GitHub App token`);
    reporter.text(`  3. Install the app on your repository: ${chalk.cyan(credentials.htmlUrl + '/installations/new')}`);

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reporter.error(message);
    return 1;
  } finally {
    serverHandle.close();
  }
}
