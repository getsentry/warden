/**
 * Fix application functionality for the warden CLI.
 */

import chalk from 'chalk';
import figures from 'figures';
import type { Finding, SkillReport } from '../types/index.js';
import { formatSeverityBadge, formatConfidenceBadge, pluralize, type Reporter } from './output/index.js';
import { ICON_CHECK } from './output/icons.js';
import { Verbosity } from './output/verbosity.js';
import { applyUnifiedDiff } from './diff-apply.js';
import { readSingleKey } from './input.js';

// Re-export for backward compatibility
export { applyUnifiedDiff } from './diff-apply.js';

export interface FixResult {
  success: boolean;
  finding: Finding;
  error?: string;
}

export interface FixSummary {
  applied: number;
  skipped: number;
  failed: number;
  results: FixResult[];
}

/**
 * Collect all fixable findings from skill reports.
 * A finding is fixable if it has both a suggestedFix.diff and a location.path.
 * Findings are sorted by file, then by line number (descending).
 */
export function collectFixableFindings(reports: SkillReport[]): Finding[] {
  const fixable: Finding[] = [];

  for (const report of reports) {
    for (const finding of report.findings) {
      if (finding.suggestedFix?.diff && finding.location?.path) {
        fixable.push(finding);
      }
    }
  }

  // Sort by file, then by line number descending
  // Note: location is guaranteed non-null by the filter above
  return fixable.sort((a, b) => {
    const aLoc = a.location;
    const bLoc = b.location;
    if (!aLoc || !bLoc) return 0;
    const pathCompare = aLoc.path.localeCompare(bLoc.path);
    if (pathCompare !== 0) return pathCompare;
    // Descending by line number
    return bLoc.startLine - aLoc.startLine;
  });
}

/**
 * Apply all fixes without prompting.
 */
export function applyAllFixes(findings: Finding[]): FixSummary {
  const results: FixResult[] = [];
  let applied = 0;
  let failed = 0;

  for (const finding of findings) {
    const location = finding.location;
    const suggestedFix = finding.suggestedFix;
    if (!location || !suggestedFix?.diff) continue;

    try {
      applyUnifiedDiff(location.path, suggestedFix.diff);
      results.push({ success: true, finding });
      applied++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      results.push({ success: false, finding, error });
      failed++;
    }
  }

  return {
    applied,
    skipped: 0,
    failed,
    results,
  };
}

/**
 * Format a diff for display with colors.
 */
function formatDiffForDisplay(diff: string): string[] {
  return diff.split('\n').map((line) => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      return chalk.green(line);
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      return chalk.red(line);
    } else if (line.startsWith('@@')) {
      return chalk.cyan(line);
    }
    return line;
  });
}

type FixAction = 'y' | 'n' | 'a' | 's';

/**
 * Prompt the user for a fix action.
 * Accepts single keypress without requiring Enter.
 * Keys: y (apply), n (skip), a (apply all remaining), s/q (skip all remaining).
 */
async function promptFixAction(message: string): Promise<FixAction> {
  process.stderr.write(message);

  const key = await readSingleKey();
  process.stderr.write(key + '\n');

  switch (key) {
    case 'y':
      return 'y';
    case 'a':
      return 'a';
    case 's':
    case 'q':
      return 's';
    default:
      return 'n';
  }
}

/**
 * Run the interactive fix flow.
 * Steps through each finding, showing the diff and prompting for action.
 * Findings are displayed in reading order (file-asc, line-asc) but applied
 * in safe order (file-asc, line-desc) to avoid line number shifts.
 */
export async function runInteractiveFixFlow(
  findings: Finding[],
  reporter: Reporter
): Promise<FixSummary> {
  const results: FixResult[] = [];
  let applied = 0;
  let skipped = 0;
  let failed = 0;

  // Display in reading order (file-asc, line-asc).
  // Input `findings` is sorted file-asc, line-desc for safe application.
  // Note: location is guaranteed non-null by collectFixableFindings
  const displayOrder = [...findings].sort((a, b) => {
    const aLoc = a.location;
    const bLoc = b.location;
    if (!aLoc || !bLoc) return 0;
    const pathCmp = aLoc.path.localeCompare(bLoc.path);
    if (pathCmp !== 0) return pathCmp;
    return aLoc.startLine - bLoc.startLine;
  });

  // Collect user decisions, then apply in safe order
  const accepted = new Set<Finding>();
  let applyAll = false;
  let skipAll = false;

  reporter.blank();
  console.error(
    chalk.bold(`${findings.length} ${pluralize(findings.length, 'fix', 'fixes')} available`)
  );

  for (let idx = 0; idx < displayOrder.length; idx++) {
    const finding = displayOrder[idx];
    if (!finding) continue;

    const location = finding.location;
    const suggestedFix = finding.suggestedFix;
    if (!location || !suggestedFix?.diff) continue;

    console.error('');

    // Severity + counter + title
    const badge = formatSeverityBadge(finding.severity);
    console.error(`${badge} ${chalk.bold(`[${idx + 1}/${displayOrder.length}]`)} ${chalk.bold(finding.title)}`);
    console.error(chalk.dim(`  ${location.path}:${location.startLine}`));

    // Description
    if (finding.description) {
      console.error(`  ${chalk.dim(finding.description)}`);
    }

    // Fix description
    if (suggestedFix.description) {
      console.error(`  ${suggestedFix.description}`);
    }

    // Confidence
    if (finding.confidence) {
      console.error('');
      console.error(`  ${formatConfidenceBadge(finding.confidence)}`);
    }

    console.error('');

    // Display the diff
    const diffLines = formatDiffForDisplay(suggestedFix.diff);
    for (const line of diffLines) {
      console.error(`  ${line}`);
    }

    console.error('');

    if (applyAll) {
      accepted.add(finding);
      console.error(chalk.green(`${ICON_CHECK} Will apply`));
      continue;
    }

    if (skipAll) {
      skipped++;
      results.push({ success: false, finding });
      console.error(chalk.yellow(`${figures.arrowRight} Skipped`));
      continue;
    }

    // Prompt for action
    const response = await promptFixAction('[y]es / [n]o / [a]pply all / [s]kip all  ');

    switch (response) {
      case 'y':
        accepted.add(finding);
        break;
      case 'a':
        applyAll = true;
        accepted.add(finding);
        console.error(chalk.dim('Applying all remaining fixes'));
        break;
      case 's':
        skipAll = true;
        skipped++;
        results.push({ success: false, finding });
        console.error(chalk.yellow(`${figures.arrowRight} Skipped`));
        break;
      case 'n':
      default:
        skipped++;
        results.push({ success: false, finding });
        console.error(chalk.yellow(`${figures.arrowRight} Skipped`));
        break;
    }
  }

  // Apply accepted fixes in safe order (file-asc, line-desc from original `findings`)
  if (accepted.size > 0) {
    console.error('');
    for (const finding of findings) {
      if (!accepted.has(finding)) continue;

      const location = finding.location;
      const suggestedFix = finding.suggestedFix;
      if (!location || !suggestedFix?.diff) continue;

      try {
        applyUnifiedDiff(location.path, suggestedFix.diff);
        applied++;
        results.push({ success: true, finding });
        console.error(chalk.green(`${ICON_CHECK} Applied: ${finding.title}`));
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        failed++;
        results.push({ success: false, finding, error });
        console.error(chalk.red(`${figures.cross} Failed: ${finding.title}: ${error}`));
      }
    }
  }

  return {
    applied,
    skipped,
    failed,
    results,
  };
}

/**
 * Render the fix summary.
 */
export function renderFixSummary(summary: FixSummary, reporter: Reporter): void {
  if (summary.applied === 0 && summary.failed === 0 && summary.skipped === 0) {
    return;
  }

  reporter.blank();

  if (reporter.verbosity === Verbosity.Quiet) {
    // Quiet mode: just counts
    const parts: string[] = [];
    if (summary.applied > 0) parts.push(`${summary.applied} applied`);
    if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
    if (summary.failed > 0) parts.push(`${summary.failed} failed`);
    console.log(`Fixes: ${parts.join(', ')}`);
    return;
  }

  console.error(chalk.bold('FIXES'));

  const parts: string[] = [];
  if (summary.applied > 0) {
    parts.push(chalk.green(`${summary.applied} applied`));
  }
  if (summary.skipped > 0) {
    parts.push(chalk.yellow(`${summary.skipped} skipped`));
  }
  if (summary.failed > 0) {
    parts.push(chalk.red(`${summary.failed} failed`));
  }

  console.error(parts.join('  '));

  // Show failed fix details
  const failedResults = summary.results.filter((r) => !r.success && r.error);
  for (const result of failedResults) {
    console.error(
      chalk.red(`  ${figures.cross} ${result.finding.title}: ${result.error}`)
    );
  }
}
