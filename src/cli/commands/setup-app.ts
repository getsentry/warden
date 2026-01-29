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

  // Show what permissions will be requested
  reporter.text('This will create a GitHub App with the following permissions:');
  reporter.text(`  ${chalk.dim('•')} contents: read        ${chalk.dim('- Read repository files')}`);
  reporter.text(`  ${chalk.dim('•')} pull_requests: write  ${chalk.dim('- Post review comments')}`);
  reporter.text(`  ${chalk.dim('•')} issues: write         ${chalk.dim('- Create/update issues')}`);
  reporter.text(`  ${chalk.dim('•')} checks: write         ${chalk.dim('- Create check runs')}`);
  reporter.text(`  ${chalk.dim('•')} metadata: read        ${chalk.dim('- Read repository metadata')}`);
  reporter.blank();

  // Start local server (serves the form and handles callback)
  reporter.step(`Starting local server on http://localhost:${port}...`);

  const serverHandle = startCallbackServer({
    port,
    expectedState: state,
    timeoutMs,
    manifest,
    org,
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
    // Open browser to our local server (which will POST to GitHub)
    if (open) {
      reporter.step('Opening browser...');
      try {
        await openBrowser(serverHandle.startUrl);
      } catch {
        reporter.warning('Could not open browser automatically.');
        reporter.blank();
        reporter.text('Open this URL in your browser:');
        reporter.text(chalk.cyan(serverHandle.startUrl));
      }
    } else {
      reporter.blank();
      reporter.text('Open this URL in your browser:');
      reporter.text(chalk.cyan(serverHandle.startUrl));
    }

    reporter.blank();
    reporter.text(`On the GitHub page, click ${chalk.cyan('"Create GitHub App"')} to continue.`);
    reporter.blank();
    reporter.text(chalk.dim('Waiting for GitHub callback... (Ctrl+C to cancel)'));

    // Wait for callback
    const { code } = await serverHandle.waitForCallback;

    // Exchange code for credentials
    reporter.blank();
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

    // Next steps - in correct order!
    const githubRepoUrl = getGitHubRepoUrl(process.cwd());
    reporter.bold('Next steps:');
    reporter.blank();

    // Step 1: Install the app (must happen first!)
    reporter.text(`  ${chalk.cyan('1.')} Install the app on your repository:`);
    reporter.text(`     ${chalk.cyan(credentials.htmlUrl + '/installations/new')}`);
    reporter.blank();

    // Step 2: Add secrets
    reporter.text(`  ${chalk.cyan('2.')} Add these secrets to your repository:`);
    if (githubRepoUrl) {
      reporter.text(`     ${chalk.cyan(githubRepoUrl + '/settings/secrets/actions')}`);
    }
    reporter.blank();
    reporter.text(`     ${chalk.white('WARDEN_APP_ID')}          ${credentials.id}`);
    reporter.text(`     ${chalk.white('WARDEN_PRIVATE_KEY')}     ${chalk.dim('(copy the key below)')}`);
    reporter.blank();

    // Private key with clear instructions
    reporter.text(`  ${chalk.cyan('Private Key')} ${chalk.dim('(copy entire block including BEGIN/END lines):')}`);
    reporter.blank();
    // Indent the private key for readability
    const pemLines = credentials.pem.trim().split('\n');
    for (const line of pemLines) {
      reporter.text(`     ${chalk.dim(line)}`);
    }
    reporter.blank();

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reporter.error(message);
    reporter.blank();

    // Provide recovery guidance if the app might have been created
    reporter.text(chalk.dim('If the GitHub App was created before this error:'));
    reporter.text(chalk.dim('  1. Go to https://github.com/settings/apps'));
    reporter.text(chalk.dim('  2. Find your app and click "Edit"'));
    reporter.text(chalk.dim('  3. Note the App ID from the URL or "About" section'));
    reporter.text(chalk.dim('  4. Scroll to "Private keys" and click "Generate a private key"'));
    reporter.text(chalk.dim('  5. Follow the "Next steps" from this command\'s success output'));

    return 1;
  } finally {
    serverHandle.close();
  }
}
