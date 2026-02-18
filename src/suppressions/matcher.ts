import { matchGlob } from '../triggers/matcher.js';
import type { Finding } from '../types/index.js';
import type { SuppressionRule } from './types.js';

/**
 * Check if a finding matches a single suppression rule.
 */
function matchesRule(finding: Finding, rule: SuppressionRule): boolean {
  const path = finding.location?.path;
  if (!path) return false;

  // Check if any path pattern matches
  const pathMatch = rule.paths.some((pattern) => matchGlob(pattern, path));
  if (!pathMatch) return false;

  // Check title substring if specified
  if (rule.title && !finding.title.toLowerCase().includes(rule.title.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Filter findings by applying suppression rules.
 * Returns findings that are NOT suppressed.
 */
export function applySuppression(
  findings: Finding[],
  rules: SuppressionRule[],
  skillName: string
): Finding[] {
  if (rules.length === 0) return findings;

  // Pre-filter rules to only those matching this skill
  const skillRules = rules.filter((r) => r.skill === skillName);
  if (skillRules.length === 0) return findings;

  return findings.filter((finding) => !skillRules.some((rule) => matchesRule(finding, rule)));
}
