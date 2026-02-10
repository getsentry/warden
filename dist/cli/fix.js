/**
 * Fix application functionality for the warden CLI.
 */
import chalk from 'chalk';
import figures from 'figures';
import { pluralize } from './output/index.js';
import { ICON_CHECK } from './output/icons.js';
import { Verbosity } from './output/verbosity.js';
import { applyUnifiedDiff } from './diff-apply.js';
// Re-export for backward compatibility
export { applyUnifiedDiff } from './diff-apply.js';
/**
 * Collect all fixable findings from skill reports.
 * A finding is fixable if it has both a suggestedFix.diff and a location.path.
 * Findings are sorted by file, then by line number (descending).
 */
export function collectFixableFindings(reports) {
    const fixable = [];
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
        if (!aLoc || !bLoc)
            return 0;
        const pathCompare = aLoc.path.localeCompare(bLoc.path);
        if (pathCompare !== 0)
            return pathCompare;
        // Descending by line number
        return bLoc.startLine - aLoc.startLine;
    });
}
/**
 * Apply all fixes without prompting.
 */
export function applyAllFixes(findings) {
    const results = [];
    let applied = 0;
    let failed = 0;
    for (const finding of findings) {
        const location = finding.location;
        const suggestedFix = finding.suggestedFix;
        if (!location || !suggestedFix?.diff)
            continue;
        try {
            applyUnifiedDiff(location.path, suggestedFix.diff);
            results.push({ success: true, finding });
            applied++;
        }
        catch (err) {
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
function formatDiffForDisplay(diff) {
    return diff.split('\n').map((line) => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            return chalk.green(line);
        }
        else if (line.startsWith('-') && !line.startsWith('---')) {
            return chalk.red(line);
        }
        else if (line.startsWith('@@')) {
            return chalk.cyan(line);
        }
        return line;
    });
}
/**
 * Read a single keypress from stdin in raw mode.
 */
async function readSingleKey() {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.once('data', (data) => {
            stdin.setRawMode(wasRaw);
            stdin.pause();
            const key = data.toString();
            // Handle Ctrl+C
            if (key === '\x03') {
                process.stderr.write('\n');
                process.exit(130);
            }
            resolve(key.toLowerCase());
        });
    });
}
/**
 * Prompt the user for a yes/no/quit response.
 * Accepts single keypress without requiring Enter.
 */
async function promptYNQ(message) {
    process.stderr.write(message);
    const key = await readSingleKey();
    process.stderr.write(key + '\n');
    switch (key) {
        case 'y':
            return 'y';
        case 'q':
            return 'q';
        default:
            return 'n';
    }
}
/**
 * Prompt the user for a yes/no response.
 * Accepts single keypress without requiring Enter.
 */
async function promptYN(message) {
    process.stderr.write(message);
    const key = await readSingleKey();
    process.stderr.write(key + '\n');
    return key === 'y';
}
/**
 * Run the interactive fix flow.
 * Displays each fix with a colored diff and prompts the user.
 */
export async function runInteractiveFixFlow(findings, reporter) {
    const results = [];
    let applied = 0;
    let skipped = 0;
    let failed = 0;
    // Ask if user wants to apply fixes
    reporter.blank();
    const shouldProceed = await promptYN(chalk.bold(`${findings.length} ${pluralize(findings.length, 'fix', 'fixes')} available. Apply fixes? [y/N] `));
    if (!shouldProceed) {
        return {
            applied: 0,
            skipped: findings.length,
            failed: 0,
            results: findings.map((f) => ({ success: false, finding: f })),
        };
    }
    reporter.blank();
    for (let idx = 0; idx < findings.length; idx++) {
        const finding = findings[idx];
        if (!finding)
            continue;
        const location = finding.location;
        const suggestedFix = finding.suggestedFix;
        if (!location || !suggestedFix?.diff)
            continue;
        // Display fix info
        console.error(chalk.bold(`Fix for: ${finding.title}`));
        console.error(chalk.dim(`  ${location.path}:${location.startLine}`));
        if (suggestedFix.description) {
            console.error(`  ${suggestedFix.description}`);
        }
        console.error('');
        // Display the diff
        const diffLines = formatDiffForDisplay(suggestedFix.diff);
        for (const line of diffLines) {
            console.error(`  ${line}`);
        }
        console.error('');
        // Prompt for this fix
        const response = await promptYNQ('Apply this fix? [y/n/q] ');
        if (response === 'q') {
            // Quit - mark remaining as skipped
            skipped++;
            results.push({ success: false, finding });
            // Skip remaining
            for (let i = idx + 1; i < findings.length; i++) {
                const remainingFinding = findings[i];
                if (remainingFinding) {
                    skipped++;
                    results.push({ success: false, finding: remainingFinding });
                }
            }
            break;
        }
        if (response === 'n') {
            skipped++;
            results.push({ success: false, finding });
            console.error(chalk.yellow(`${figures.arrowRight} Skipped`));
            console.error('');
            continue;
        }
        // Apply the fix
        try {
            applyUnifiedDiff(location.path, suggestedFix.diff);
            applied++;
            results.push({ success: true, finding });
            console.error(chalk.green(`${ICON_CHECK} Applied fix for: ${finding.title}`));
        }
        catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            failed++;
            results.push({ success: false, finding, error });
            console.error(chalk.red(`${figures.cross} Failed: ${error}`));
        }
        console.error('');
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
export function renderFixSummary(summary, reporter) {
    if (summary.applied === 0 && summary.failed === 0 && summary.skipped === 0) {
        return;
    }
    reporter.blank();
    if (reporter.verbosity === Verbosity.Quiet) {
        // Quiet mode: just counts
        const parts = [];
        if (summary.applied > 0)
            parts.push(`${summary.applied} applied`);
        if (summary.skipped > 0)
            parts.push(`${summary.skipped} skipped`);
        if (summary.failed > 0)
            parts.push(`${summary.failed} failed`);
        console.log(`Fixes: ${parts.join(', ')}`);
        return;
    }
    console.error(chalk.bold('FIXES'));
    const parts = [];
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
        console.error(chalk.red(`  ${figures.cross} ${result.finding.title}: ${result.error}`));
    }
}
//# sourceMappingURL=fix.js.map