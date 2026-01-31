import chalk from 'chalk';
import figures from 'figures';
import type { SkillReport, Finding, FileChange, UsageStats } from '../../types/index.js';
import { Verbosity } from './verbosity.js';
import { type OutputMode, timestamp } from './tty.js';
import {
  formatDuration,
  formatFindingCounts,
  formatFindingCountsPlain,
  formatUsage,
  formatUsagePlain,
  countBySeverity,
} from './formatters.js';
import { BoxRenderer } from './box.js';
import { ICON_CHECK } from './icons.js';
import { getVersion } from '../../utils/index.js';

/**
 * ASCII art logo for TTY header.
 */
const LOGO = `
 __    __              _
/ / /\\ \\ \\__ _ _ __ __| | ___ _ __
\\ \\/  \\/ / _\` | '__/ _\` |/ _ \\ '_ \\
 \\  /\\  / (_| | | | (_| |  __/ | | |
  \\/  \\/ \\__,_|_|  \\__,_|\\___|_| |_|
`.trimStart();

/**
 * Callbacks for skill runner progress reporting.
 */
export interface SkillRunnerCallbacks {
  /** Start time of the skill execution (for elapsed time calculations) */
  skillStartTime?: number;
  onFileStart?: (file: string, index: number, total: number) => void;
  onHunkStart?: (file: string, hunkNum: number, total: number, lineRange: string) => void;
  onHunkComplete?: (file: string, hunkNum: number, findings: Finding[]) => void;
  onFileComplete?: (file: string, index: number, total: number) => void;
}

/**
 * Main reporter class for CLI output.
 * Handles different verbosity levels and TTY/non-TTY modes.
 */
export class Reporter {
  readonly mode: OutputMode;
  readonly verbosity: Verbosity;

  constructor(mode: OutputMode, verbosity: Verbosity) {
    this.mode = mode;
    this.verbosity = verbosity;
  }

  /**
   * Output to stderr (status messages).
   */
  private log(message: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }
    console.error(message);
  }

  /**
   * Output to stderr with timestamp (CI mode).
   */
  private logCI(message: string): void {
    console.error(`[${timestamp()}] warden: ${message}`);
  }

  /**
   * Print the header with logo and version.
   */
  header(): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log('');
      for (const line of LOGO.split('\n')) {
        this.log(chalk.dim(line));
      }
      this.log(chalk.dim(`v${getVersion()}`));
      this.log('');
    } else {
      this.logCI(`Warden v${getVersion()}`);
    }
  }

  /**
   * Start the context section (e.g., "Analyzing changes from HEAD~3...")
   */
  startContext(description: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.dim(description));
      this.log('');
    } else {
      this.logCI(description);
    }
  }

  /**
   * Display the list of files being analyzed.
   */
  contextFiles(files: FileChange[]): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    const totalChunks = files.reduce((sum, f) => sum + (f.chunks ?? 0), 0);

    if (this.mode.isTTY) {
      this.log(
        chalk.bold('FILES') +
          chalk.cyan(`  ${files.length} files`) +
          chalk.dim(` · ${totalChunks} chunks`)
      );

      // Show up to 10 files
      const displayFiles = files.slice(0, 10);
      for (const file of displayFiles) {
        let statusSymbol: string;
        if (file.status === 'added') {
          statusSymbol = chalk.green('+');
        } else if (file.status === 'removed') {
          statusSymbol = chalk.red('-');
        } else {
          statusSymbol = chalk.yellow('~');
        }
        const chunkInfo = file.chunks ? chalk.dim(` (${file.chunks} chunk${file.chunks !== 1 ? 's' : ''})`) : '';
        this.log(`  ${statusSymbol} ${file.filename}${chunkInfo}`);
      }

      if (files.length > 10) {
        this.log(chalk.dim(`  ... and ${files.length - 10} more`));
      }

      this.log('');
    } else {
      this.logCI(`Found ${files.length} changed files with ${totalChunks} chunks`);
    }
  }

  /**
   * Aggregate usage stats from multiple reports.
   */
  private aggregateUsage(reports: SkillReport[]): UsageStats | undefined {
    const usages = reports.map((r) => r.usage).filter((u): u is UsageStats => u !== undefined);
    if (usages.length === 0) return undefined;

    return usages.reduce((acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
      cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
      costUSD: acc.costUSD + u.costUSD,
    }));
  }

  /**
   * Render the summary section.
   */
  renderSummary(reports: SkillReport[], totalDuration: number): void {
    const allFindings: Finding[] = [];
    let totalFailedHunks = 0;
    for (const report of reports) {
      allFindings.push(...report.findings);
      totalFailedHunks += report.failedHunks ?? 0;
    }
    const counts = countBySeverity(allFindings);
    const totalUsage = this.aggregateUsage(reports);

    if (this.verbosity === Verbosity.Quiet) {
      // Quiet mode: just output the summary line
      const countStr = formatFindingCountsPlain(counts);
      console.log(countStr);
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.bold('SUMMARY'));
      this.log(formatFindingCounts(counts));
      if (totalFailedHunks > 0) {
        this.log(chalk.yellow(`${figures.warning}  ${totalFailedHunks} chunk${totalFailedHunks === 1 ? '' : 's'} failed to analyze`));
      }
      const durationLine = `Analysis completed in ${formatDuration(totalDuration)}`;
      if (totalUsage) {
        this.log(chalk.dim(`${durationLine} · ${formatUsage(totalUsage)}`));
      } else {
        this.log(chalk.dim(durationLine));
      }
    } else {
      this.logCI(`Summary: ${formatFindingCountsPlain(counts)}`);
      if (totalFailedHunks > 0) {
        this.logCI(`WARN: ${totalFailedHunks} chunk(s) failed to analyze`);
      }
      if (totalUsage) {
        this.logCI(`Usage: ${formatUsagePlain(totalUsage)}`);
      }
      this.logCI(`Total time: ${formatDuration(totalDuration)}`);
    }
  }

  /**
   * Display the configuration section with triggers.
   */
  configTriggers(
    loaded: number,
    matched: number,
    triggers: { name: string; skill: string }[]
  ): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(
        chalk.bold('CONFIG') +
          chalk.cyan(`  ${loaded} triggers`) +
          chalk.dim(` · ${matched} matched`)
      );

      // Show matched triggers
      for (const trigger of triggers) {
        this.log(`  ${chalk.green(ICON_CHECK)} ${trigger.name} ${chalk.dim(`(${trigger.skill})`)}`);
      }

      this.log('');
    } else {
      this.logCI(`Config: ${loaded} triggers, ${matched} matched`);
      for (const trigger of triggers) {
        this.logCI(`  ${trigger.name} (${trigger.skill})`);
      }
    }
  }

  /**
   * Log a step message.
   */
  step(message: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(`${chalk.cyan(figures.arrowRight)} ${message}`);
    } else {
      this.logCI(message);
    }
  }

  /**
   * Log a success message.
   */
  success(message: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(`${chalk.green(ICON_CHECK)} ${message}`);
    } else {
      this.logCI(message);
    }
  }

  /**
   * Log a file creation message (green "Created" prefix, no icon).
   */
  created(filename: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(`${chalk.green('Created')} ${filename}`);
    } else {
      this.logCI(`Created ${filename}`);
    }
  }

  /**
   * Log a skipped file message (yellow "Skipped" prefix with reason).
   */
  skipped(filename: string, reason?: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    const suffix = reason ? chalk.dim(` (${reason})`) : '';
    if (this.mode.isTTY) {
      this.log(`${chalk.yellow('Skipped')} ${filename}${suffix}`);
    } else {
      this.logCI(`Skipped ${filename}${reason ? ` (${reason})` : ''}`);
    }
  }

  /**
   * Log a warning message.
   */
  warning(message: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(`${chalk.yellow(figures.warning)}  ${message}`);
    } else {
      this.logCI(`WARN: ${message}`);
    }
  }

  /**
   * Log an error message.
   * Errors are always shown, even in quiet mode.
   */
  error(message: string): void {
    if (this.mode.isTTY) {
      console.error(`${chalk.red(figures.cross)} ${message}`);
    } else {
      console.error(`[${timestamp()}] warden: ERROR: ${message}`);
    }
  }

  /**
   * Log a debug message.
   */
  debug(message: string): void {
    if (this.verbosity < Verbosity.Debug) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.dim(`[debug] ${message}`));
    } else {
      this.logCI(`DEBUG: ${message}`);
    }
  }

  /**
   * Log a hint/tip message.
   */
  tip(message: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.dim(`Tip: ${message}`));
    }
    // No tips in CI mode
  }

  /**
   * Log plain text (no prefix).
   */
  text(message: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(message);
    } else {
      this.logCI(message);
    }
  }

  /**
   * Log bold text.
   */
  bold(message: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.bold(message));
    } else {
      this.logCI(message);
    }
  }

  /**
   * Output a blank line.
   */
  blank(): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }
    this.log('');
  }

  /**
   * Render an empty state box (e.g., "No changes found").
   */
  renderEmptyState(message: string, tip?: string): void {
    if (this.verbosity === Verbosity.Quiet) {
      console.log(message);
      return;
    }

    if (this.mode.isTTY) {
      const box = new BoxRenderer({
        title: 'warden',
        mode: this.mode,
      });

      box.header();
      box.blank();
      box.content(`${chalk.yellow(figures.warning)}  ${message}`);
      if (tip) {
        box.blank();
        box.content(chalk.dim(`Tip: ${tip}`));
      }
      box.blank();
      box.footer();

      for (const line of box.render()) {
        this.log(line);
      }
    } else {
      this.logCI(`WARN: ${message}`);
      if (tip) {
        this.logCI(`Tip: ${tip}`);
      }
    }
  }
}
