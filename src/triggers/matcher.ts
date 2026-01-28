import type { Trigger } from '../config/schema.js';
import { SEVERITY_ORDER } from '../types/index.js';
import type { EventContext, Severity, SkillReport } from '../types/index.js';

/**
 * Match a glob pattern against a file path.
 * Supports ** for recursive matching and * for single directory matching.
 */
export function matchGlob(pattern: string, path: string): boolean {
  // Use placeholders to avoid replacement conflicts
  let regexPattern = pattern
    // First, replace glob patterns with placeholders
    .replace(/\*\*\//g, '\0GLOBSTAR_SLASH\0')
    .replace(/\*\*/g, '\0GLOBSTAR\0')
    .replace(/\*/g, '\0STAR\0')
    .replace(/\?/g, '\0QUESTION\0');

  // Escape regex special characters
  regexPattern = regexPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Replace placeholders with regex patterns
  regexPattern = regexPattern
    .replace(/\0GLOBSTAR_SLASH\0/g, '(?:.*/)?')  // **/ matches zero or more directories
    .replace(/\0GLOBSTAR\0/g, '.*')               // ** matches anything
    .replace(/\0STAR\0/g, '[^/]*')                // * matches anything except /
    .replace(/\0QUESTION\0/g, '[^/]');            // ? matches single char except /

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Check if a trigger matches the given event context.
 */
export function matchTrigger(trigger: Trigger, context: EventContext): boolean {
  if (trigger.event !== context.eventType) {
    return false;
  }

  if (!trigger.actions.includes(context.action)) {
    return false;
  }

  const filenames = context.pullRequest?.files.map((f) => f.filename);
  const pathPatterns = trigger.filters?.paths;
  const ignorePatterns = trigger.filters?.ignorePaths;

  if (pathPatterns && filenames) {
    const hasMatch = filenames.some((file) =>
      pathPatterns.some((pattern) => matchGlob(pattern, file))
    );
    if (!hasMatch) {
      return false;
    }
  }

  if (ignorePatterns && filenames) {
    const allIgnored = filenames.every((file) =>
      ignorePatterns.some((pattern) => matchGlob(pattern, file))
    );
    if (allIgnored) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a report has any findings at or above the given severity threshold.
 */
export function shouldFail(report: SkillReport, failOn: Severity): boolean {
  const threshold = SEVERITY_ORDER[failOn];
  return report.findings.some((f) => SEVERITY_ORDER[f.severity] <= threshold);
}

/**
 * Count findings at or above the given severity threshold.
 */
export function countFindingsAtOrAbove(report: SkillReport, failOn: Severity): number {
  const threshold = SEVERITY_ORDER[failOn];
  return report.findings.filter((f) => SEVERITY_ORDER[f.severity] <= threshold).length;
}

/**
 * Count findings of a specific severity across multiple reports.
 */
export function countSeverity(reports: SkillReport[], severity: Severity): number {
  return reports.reduce(
    (count, report) =>
      count + report.findings.filter((f) => f.severity === severity).length,
    0
  );
}
