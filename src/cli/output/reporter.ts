import chalk from 'chalk';
import figures from 'figures';
import type { SkillReport, Finding, FileChange } from '../../types/index.js';
import { Verbosity } from './verbosity.js';
import { type OutputMode, timestamp } from './tty.js';
import {
  formatDuration,
  formatFindingCounts,
  formatFindingCountsPlain,
  countBySeverity,
} from './formatters.js';

const VERSION = '0.1.0';

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
      this.log(chalk.dim(`v${VERSION}`));
      this.log('');
    } else {
      this.logCI(`Warden v${VERSION}`);
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

    if (this.mode.isTTY) {
      this.log(chalk.bold('FILES') + chalk.dim(`  ${files.length} files changed`));

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
        this.log(`  ${statusSymbol} ${file.filename}`);
      }

      if (files.length > 10) {
        this.log(chalk.dim(`  ... and ${files.length - 10} more`));
      }

      this.log('');
    } else {
      this.logCI(`Found ${files.length} changed files`);
    }
  }

  /**
   * Render the summary section.
   */
  renderSummary(reports: SkillReport[], totalDuration: number): void {
    const allFindings: Finding[] = [];
    for (const report of reports) {
      allFindings.push(...report.findings);
    }
    const counts = countBySeverity(allFindings);

    if (this.verbosity === Verbosity.Quiet) {
      // Quiet mode: just output the summary line
      const countStr = formatFindingCountsPlain(counts);
      console.log(countStr);
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.bold('SUMMARY'));
      this.log(formatFindingCounts(counts));
      this.log(chalk.dim(`Analysis completed in ${formatDuration(totalDuration)}`));
    } else {
      this.logCI(`Summary: ${formatFindingCountsPlain(counts)}`);
      this.logCI(`Total time: ${formatDuration(totalDuration)}`);
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
      this.log(`${chalk.green(figures.tick)} ${message}`);
    } else {
      this.logCI(message);
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
      this.log(`${chalk.yellow(figures.warning)} ${message}`);
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
   * Output a blank line.
   */
  blank(): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }
    this.log('');
  }
}
