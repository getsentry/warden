import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { z } from 'zod';
import { parsePatch } from '../diff/parser.js';
import { applyDiffToContent } from '../diff/apply.js';
import type { Finding, UsageStats } from '../types/index.js';
import { callHaiku } from './haiku.js';
import { aggregateUsage } from './usage.js';

export interface FixQualityStats {
  checked: number;
  strippedDeterministic: number;
  strippedSemantic: number;
  semanticUnavailable: number;
}

export interface SanitizeSuggestedFixesResult {
  findings: Finding[];
  stats: FixQualityStats;
  usage?: UsageStats;
}

interface SanitizeSuggestedFixesOptions {
  repoPath: string;
  apiKey?: string;
  maxRetries?: number;
}

const SEMANTIC_PROMPT_MAX_CHARS = 4000;

function stripSuggestedFix(finding: Finding): Finding {
  const { suggestedFix, ...rest } = finding;
  void suggestedFix;
  return rest;
}

function normalizeDiffPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (trimmed.startsWith('a/') || trimmed.startsWith('b/')) {
    return trimmed.slice(2);
  }
  return trimmed;
}

function extractDiffPaths(diff: string): { oldPath?: string; newPath?: string; headerCount: number } {
  const oldHeaders = diff.match(/^---\s+([^\n]+)$/gm) ?? [];
  const newHeaders = diff.match(/^\+\+\+\s+([^\n]+)$/gm) ?? [];
  const headerCount = Math.max(oldHeaders.length, newHeaders.length);

  const oldPath = oldHeaders[0]?.replace(/^---\s+/, '');
  const newPath = newHeaders[0]?.replace(/^\+\+\+\s+/, '');

  return { oldPath, newPath, headerCount };
}

function overlapsAnchor(diff: string, finding: Finding): boolean {
  const location = finding.location;
  const anchorStart = location?.startLine;
  if (!anchorStart || !location) return false;
  const anchorEnd = location.endLine ?? anchorStart;
  const hunks = parsePatch(diff);
  if (hunks.length === 0) return false;

  return hunks.some((h) => {
    // Finding locations are in pre-fix file coordinates, so compare against
    // the old-side hunk range to avoid false mismatches when line counts shift.
    const start = h.oldStart;
    const end = h.oldStart + Math.max(h.oldCount, 1) - 1;
    return start <= anchorEnd && end >= anchorStart;
  });
}

type DeterministicResult =
  | { pass: true; fileContent: string; patchedContent: string }
  | { pass: false };

function runDeterministicGate(finding: Finding, repoPath: string): DeterministicResult {
  if (!finding.location?.path || !finding.suggestedFix?.diff) return { pass: false };

  const diff = finding.suggestedFix.diff;
  const hunks = parsePatch(diff);
  if (hunks.length === 0) return { pass: false };

  const { oldPath, newPath, headerCount } = extractDiffPaths(diff);
  if (headerCount > 1) return { pass: false };

  const findingPath = finding.location.path;
  if (oldPath && oldPath !== '/dev/null' && normalizeDiffPath(oldPath) !== findingPath) {
    return { pass: false };
  }
  if (newPath && newPath !== '/dev/null' && normalizeDiffPath(newPath) !== findingPath) {
    return { pass: false };
  }
  if (oldPath && newPath && oldPath !== '/dev/null' && newPath !== '/dev/null' && normalizeDiffPath(oldPath) !== normalizeDiffPath(newPath)) {
    return { pass: false };
  }

  if (!overlapsAnchor(diff, finding)) return { pass: false };

  const fullPath = join(repoPath, findingPath);
  const resolvedFull = resolve(fullPath);
  const resolvedRepo = resolve(repoPath);
  const inRepo = resolvedFull === resolvedRepo || resolvedFull.startsWith(resolvedRepo + sep);
  if (!inRepo) return { pass: false };

  let fileContent: string;
  try {
    fileContent = readFileSync(fullPath, 'utf-8');
  } catch {
    return { pass: false };
  }

  try {
    const patchedContent = applyDiffToContent(fileContent, diff);
    return { pass: true, fileContent, patchedContent };
  } catch {
    return { pass: false };
  }
}

const SemanticFixVerdictSchema = z.object({
  verdict: z.enum(['pass', 'fail']),
  reason: z.string().min(1),
});

async function runSemanticGate(
  finding: Finding,
  fileContent: string,
  patchedContent: string,
  apiKey?: string,
  maxRetries?: number
): Promise<{ verdict: 'pass' | 'fail' | 'unavailable'; usage?: UsageStats }> {
  if (!apiKey) {
    return { verdict: 'unavailable' };
  }
  const originalForPrompt = fileContent.slice(0, SEMANTIC_PROMPT_MAX_CHARS);
  const patchedForPrompt = patchedContent.slice(0, SEMANTIC_PROMPT_MAX_CHARS);

  const prompt = [
    'Judge whether this suggested code fix is valid.',
    'Return JSON only: {"verdict":"pass|fail","reason":"..."}',
    'Pass only if the diff clearly addresses the stated issue without obvious regressions in the shown code.',
    '',
    `Issue title: ${finding.title}`,
    `Issue description: ${finding.description}`,
    '',
    'Original file:',
    originalForPrompt,
    '',
    'Patched file:',
    patchedForPrompt,
    '',
    'Suggested diff:',
    finding.suggestedFix?.diff ?? '',
  ].join('\n');

  const result = await callHaiku({
    apiKey,
    prompt,
    schema: SemanticFixVerdictSchema,
    maxTokens: 220,
    timeout: 8000,
    maxRetries: maxRetries ?? 1,
  });

  if (!result.success) {
    return { verdict: 'unavailable', usage: result.usage };
  }

  return { verdict: result.data.verdict, usage: result.usage };
}

export async function sanitizeFindingsSuggestedFixes(
  findings: Finding[],
  options: SanitizeSuggestedFixesOptions
): Promise<SanitizeSuggestedFixesResult> {
  const stats: FixQualityStats = {
    checked: 0,
    strippedDeterministic: 0,
    strippedSemantic: 0,
    semanticUnavailable: 0,
  };
  const semanticUsage: UsageStats[] = [];
  const sanitized: Finding[] = [];

  for (const finding of findings) {
    if (!finding.suggestedFix) {
      sanitized.push(finding);
      continue;
    }

    stats.checked++;

    const deterministic = runDeterministicGate(finding, options.repoPath);
    if (!deterministic.pass) {
      stats.strippedDeterministic++;
      sanitized.push(stripSuggestedFix(finding));
      continue;
    }

    const semantic = await runSemanticGate(
      finding,
      deterministic.fileContent,
      deterministic.patchedContent,
      options.apiKey,
      options.maxRetries
    );
    if (semantic.usage) {
      semanticUsage.push(semantic.usage);
    }

    if (semantic.verdict === 'fail') {
      stats.strippedSemantic++;
      sanitized.push(stripSuggestedFix(finding));
      continue;
    }

    if (semantic.verdict === 'unavailable') {
      stats.semanticUnavailable++;
    }

    sanitized.push(finding);
  }

  const usage = semanticUsage.length > 0 ? aggregateUsage(semanticUsage) : undefined;
  return { findings: sanitized, stats, usage };
}
