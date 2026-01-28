import chalk from 'chalk';
import figures from 'figures';
import type { SkillReport, Finding, FileChange, Severity } from '../../types/index.js';
import { Verbosity } from './verbosity.js';
import { type OutputMode, timestamp } from './tty.js';
import { Spinner } from './spinner.js';
import {
  formatDuration,
  formatSeverityBadge,
  formatSeverityPlain,
  formatFindingCounts,
  formatFindingCountsPlain,
  formatProgress,
  formatLocation,
  truncate,
  padRight,
} from './formatters.js';

const VERSION = '0.1.0';

/**
 * Callbacks for skill runner progress reporting.
 */
export interface SkillRunnerCallbacks {
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
  private readonly mode: OutputMode;
  private readonly verbosity: Verbosity;
  private readonly spinner: Spinner;
  private currentSkill: string | null = null;
  private skillStartTime = 0;

  constructor(mode: OutputMode, verbosity: Verbosity) {
    this.mode = mode;
    this.verbosity = verbosity;
    this.spinner = new Spinner(mode, verbosity);
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
   * Print the header with version.
   */
  header(): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log('');
      this.log(chalk.bold(`warden v${VERSION}`));
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
        const statusSymbol = file.status === 'added' ? chalk.green('+') :
                             file.status === 'removed' ? chalk.red('-') :
                             chalk.yellow('~');
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
   * Start the skills section.
   */
  startSkills(skills: string[]): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.bold('SKILLS') + chalk.dim(`  Running ${skills.length} skill${skills.length === 1 ? '' : 's'}`));
      this.log('');
    }
  }

  /**
   * Start a skill execution.
   */
  startSkill(name: string): void {
    this.currentSkill = name;
    this.skillStartTime = Date.now();

    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.cyan.bold(name));
    } else {
      this.logCI(`Starting skill: ${name}`);
    }
  }

  /**
   * Create callbacks for skill runner progress.
   */
  createCallbacks(): SkillRunnerCallbacks {
    return {
      onFileStart: (file, index, total) => this.startFile(file, index, total),
      onHunkStart: (file, hunkNum, totalHunks, lineRange) =>
        this.startHunk(file, hunkNum, totalHunks, lineRange),
      onHunkComplete: (file, hunkNum, findings) => this.hunkComplete(file, hunkNum, findings),
      onFileComplete: (file, index, total) => this.fileComplete(file, index, total),
    };
  }

  /**
   * Report starting analysis of a file.
   */
  startFile(filename: string, index: number, total: number): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    const progress = formatProgress(index + 1, total);
    const maxFilenameWidth = Math.max(30, this.mode.columns - 20);
    const displayName = truncate(filename, maxFilenameWidth);

    if (this.mode.isTTY) {
      if (this.verbosity >= Verbosity.Verbose) {
        this.log(`  ${displayName} ${progress}`);
      } else {
        // Normal mode: use spinner
        this.spinner.start(`  ${padRight(displayName, maxFilenameWidth)} ${progress}`);
      }
    } else {
      this.logCI(`${this.currentSkill}: Analyzing ${filename} (${index + 1}/${total})`);
    }
  }

  /**
   * Report starting analysis of a hunk.
   */
  startHunk(file: string, hunkNum: number, totalHunks: number, lineRange: string): void {
    if (this.verbosity < Verbosity.Verbose) {
      return;
    }

    if (this.mode.isTTY) {
      this.log(chalk.dim(`    Hunk ${hunkNum}/${totalHunks} @ lines ${lineRange}`));
    }
  }

  /**
   * Report completion of a hunk with its findings.
   */
  hunkComplete(file: string, hunkNum: number, findings: Finding[]): void {
    if (this.verbosity < Verbosity.Verbose) {
      return;
    }

    if (findings.length === 0) {
      if (this.mode.isTTY) {
        this.log(chalk.dim('      No issues found'));
      }
      return;
    }

    // In verbose mode, show findings as they're discovered
    for (const finding of findings) {
      if (this.mode.isTTY) {
        const badge = formatSeverityBadge(finding.severity);
        const location = finding.location?.startLine ? `(line ${finding.location.startLine})` : '';
        this.log(`      ${badge} ${finding.title} ${chalk.dim(location)}`);
      } else {
        const badge = formatSeverityPlain(finding.severity);
        const loc = finding.location
          ? formatLocation(finding.location.path, finding.location.startLine)
          : file;
        this.logCI(`${this.currentSkill}: ${badge} ${finding.title} @ ${loc}`);
      }
    }
  }

  /**
   * Report completion of file analysis.
   */
  fileComplete(_file: string, _index: number, _total: number): void {
    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    if (this.verbosity < Verbosity.Verbose && this.mode.isTTY) {
      // In normal mode, stop spinner silently (succeed will be called per-skill)
      this.spinner.stop();
    }
  }

  /**
   * Report completion of a skill.
   */
  skillComplete(report: SkillReport): void {
    const duration = Date.now() - this.skillStartTime;

    // Stop any running spinner
    this.spinner.stop();

    if (this.verbosity === Verbosity.Quiet) {
      return;
    }

    // Count findings by severity
    const counts = this.countBySeverity(report.findings);
    const countStr = this.mode.isTTY
      ? formatFindingCounts(counts)
      : formatFindingCountsPlain(counts);

    if (this.mode.isTTY) {
      this.log(`  ${chalk.green(figures.tick)} ${countStr} ${chalk.dim(formatDuration(duration))}`);
      this.log('');
    } else {
      this.logCI(`${this.currentSkill}: Completed in ${formatDuration(duration)} - ${countStr}`);
    }

    this.currentSkill = null;
  }

  /**
   * Render the final results section.
   */
  renderResults(_reports: SkillReport[]): void {
    // Results are rendered as before via terminal.ts
    // This method is a placeholder for consistency
  }

  /**
   * Render the summary section.
   */
  renderSummary(reports: SkillReport[], totalDuration: number): void {
    // Count all findings
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const report of reports) {
      for (const finding of report.findings) {
        counts[finding.severity]++;
      }
    }

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
   * Log a step message (replacing logStep).
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
   * Log a success message (replacing logSuccess).
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
   * Log a warning message (replacing logWarning).
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
   * Log an error message (replacing logError).
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

  /**
   * Count findings by severity.
   */
  private countBySeverity(findings: Finding[]): Record<Severity, number> {
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const finding of findings) {
      counts[finding.severity]++;
    }

    return counts;
  }
}
