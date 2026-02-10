import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
import { countBySeverity } from './formatters.js';
/**
 * Get the default run logs directory.
 * Uses WARDEN_STATE_DIR env var if set, otherwise ~/.local/warden/runs
 */
export function getRunLogsDir() {
    const stateDir = process.env['WARDEN_STATE_DIR'];
    if (stateDir) {
        return join(stateDir, 'runs');
    }
    return join(homedir(), '.local', 'warden', 'runs');
}
/**
 * Generate a run log filename from directory name and timestamp.
 * Format: {dirname}_{timestamp}.jsonl
 * Timestamp has colons replaced with hyphens for filesystem compatibility.
 */
export function generateRunLogFilename(cwd, timestamp = new Date()) {
    const dirName = basename(cwd) || 'unknown';
    const ts = timestamp.toISOString().replace(/:/g, '-');
    return `${dirName}_${ts}.jsonl`;
}
/**
 * Get the full path for an automatic run log.
 */
export function getRunLogPath(cwd, timestamp = new Date()) {
    return join(getRunLogsDir(), generateRunLogFilename(cwd, timestamp));
}
/**
 * Aggregate usage stats from reports.
 */
function aggregateUsage(reports) {
    const usages = reports.map((r) => r.usage).filter((u) => u !== undefined);
    if (usages.length === 0)
        return undefined;
    return usages.reduce((acc, u) => ({
        inputTokens: acc.inputTokens + u.inputTokens,
        outputTokens: acc.outputTokens + u.outputTokens,
        cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
        cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
        costUSD: acc.costUSD + u.costUSD,
    }));
}
/**
 * Write skill reports to a JSONL file.
 * Each line contains one skill report with run metadata.
 * A final summary line is appended at the end.
 */
export function writeJsonlReport(outputPath, reports, durationMs) {
    const resolvedPath = resolve(process.cwd(), outputPath);
    const timestamp = new Date().toISOString();
    const cwd = process.cwd();
    const runMetadata = {
        timestamp,
        durationMs,
        cwd,
    };
    const lines = [];
    // Write one line per skill report
    for (const report of reports) {
        const record = {
            run: runMetadata,
            skill: report.skill,
            summary: report.summary,
            findings: report.findings,
            metadata: report.metadata,
            durationMs: report.durationMs,
            usage: report.usage,
            auxiliaryUsage: report.auxiliaryUsage,
            files: report.files?.map((f) => ({
                filename: f.filename,
                findings: f.findingCount,
                durationMs: f.durationMs,
                usage: f.usage,
            })),
        };
        lines.push(JSON.stringify(record));
    }
    // Write a summary line at the end
    const allFindings = reports.flatMap((r) => r.findings);
    const totalAuxiliaryUsage = reports.reduce((acc, r) => mergeAuxiliaryUsage(acc, r.auxiliaryUsage), undefined);
    const summaryRecord = {
        run: runMetadata,
        type: 'summary',
        totalFindings: allFindings.length,
        bySeverity: countBySeverity(allFindings),
        usage: aggregateUsage(reports),
    };
    if (totalAuxiliaryUsage) {
        summaryRecord['auxiliaryUsage'] = totalAuxiliaryUsage;
    }
    lines.push(JSON.stringify(summaryRecord));
    // Ensure parent directory exists
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, lines.join('\n') + '\n');
}
//# sourceMappingURL=jsonl.js.map