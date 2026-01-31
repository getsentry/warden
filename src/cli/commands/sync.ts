import chalk from 'chalk';
import {
  fetchRemote,
  listCachedRemotes,
  parseRemoteRef,
} from '../../skills/remote.js';
import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';

/**
 * Run the sync command.
 * Updates cached remote skills to their latest versions.
 * Pinned skills (with @sha) are skipped as they're immutable.
 */
export async function runSync(options: CLIOptions, reporter: Reporter): Promise<number> {
  const cachedRemotes = listCachedRemotes();

  if (cachedRemotes.length === 0) {
    reporter.warning('No remote skills cached.');
    reporter.tip('Add remote skills with: warden add --remote owner/repo --skill name');
    return 0;
  }

  // If a specific remote is provided, only sync that one
  const targetRepo = options.remote;
  const remotesToSync = targetRepo
    ? cachedRemotes.filter(({ ref }) => ref === targetRepo || ref.startsWith(`${targetRepo}@`))
    : cachedRemotes;

  if (targetRepo && remotesToSync.length === 0) {
    reporter.error(`Remote not found in cache: ${targetRepo}`);
    reporter.blank();
    reporter.text('Cached remotes:');
    for (const { ref } of cachedRemotes) {
      reporter.text(`  - ${ref}`);
    }
    return 1;
  }

  // Separate pinned and unpinned remotes
  const unpinnedRemotes = remotesToSync.filter(({ ref }) => {
    const parsed = parseRemoteRef(ref);
    return !parsed.sha;
  });

  const pinnedRemotes = remotesToSync.filter(({ ref }) => {
    const parsed = parseRemoteRef(ref);
    return !!parsed.sha;
  });

  if (unpinnedRemotes.length === 0) {
    if (pinnedRemotes.length > 0) {
      reporter.warning('All cached remotes are pinned to specific versions.');
      reporter.text('Pinned remotes do not need syncing as they are immutable.');
      for (const { ref } of pinnedRemotes) {
        reporter.text(`  - ${ref} ${chalk.dim('(pinned)')}`);
      }
    } else {
      reporter.warning('No remotes to sync.');
    }
    return 0;
  }

  reporter.bold('SYNC REMOTE SKILLS');
  reporter.blank();

  let updated = 0;
  let errors = 0;

  for (const { ref, entry } of unpinnedRemotes) {
    reporter.step(`Syncing ${ref}...`);

    const previousSha = entry.sha;

    try {
      const newSha = await fetchRemote(ref, { force: true });

      if (newSha !== previousSha) {
        reporter.success(`${ref}: updated ${chalk.dim(previousSha.slice(0, 7))} -> ${chalk.dim(newSha.slice(0, 7))}`);
        updated++;
      } else {
        reporter.text(`${ref}: ${chalk.dim('already up to date')}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reporter.error(`${ref}: ${message}`);
      errors++;
    }
  }

  // Show pinned remotes that were skipped
  if (pinnedRemotes.length > 0 && !targetRepo) {
    reporter.blank();
    reporter.text(chalk.dim('Skipped pinned remotes:'));
    for (const { ref } of pinnedRemotes) {
      reporter.text(chalk.dim(`  - ${ref}`));
    }
  }

  // Summary
  reporter.blank();
  if (errors > 0) {
    reporter.warning(`Synced with ${errors} error${errors === 1 ? '' : 's'}.`);
    return 1;
  }

  if (updated > 0) {
    reporter.success(`Updated ${updated} remote${updated === 1 ? '' : 's'}.`);
  } else {
    reporter.success('All remotes up to date.');
  }

  return 0;
}
