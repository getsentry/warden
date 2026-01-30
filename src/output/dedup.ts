import { createHash } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';
import type { Finding } from '../types/index.js';

/**
 * Parsed marker data from a Warden comment.
 */
export interface WardenMarker {
  path: string;
  line: number;
  contentHash: string;
}

/**
 * Existing Warden comment from GitHub.
 */
export interface ExistingComment {
  id: number;
  path: string;
  line: number;
  title: string;
  description: string;
  contentHash: string;
}

/**
 * Generate a short content hash from title and description.
 * Used for exact-match deduplication.
 */
export function generateContentHash(title: string, description: string): string {
  const content = `${title}\n${description}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/**
 * Generate the marker HTML comment to embed in comment body.
 * Format: <!-- warden:v1:{path}:{line}:{contentHash} -->
 */
export function generateMarker(path: string, line: number, contentHash: string): string {
  return `<!-- warden:v1:${path}:${line}:${contentHash} -->`;
}

/**
 * Parse a Warden marker from a comment body.
 * Returns null if no valid marker is found.
 */
export function parseMarker(body: string): WardenMarker | null {
  const match = body.match(/<!-- warden:v1:([^:]+):(\d+):([a-f0-9]+) -->/);
  if (!match) {
    return null;
  }

  const [, path, lineStr, contentHash] = match;
  if (!path || !lineStr || !contentHash) {
    return null;
  }

  return {
    path,
    line: parseInt(lineStr, 10),
    contentHash,
  };
}

/**
 * Parse title and description from a Warden comment body.
 * Expected format: **:emoji: Title**\n\nDescription
 */
export function parseWardenComment(body: string): { title: string; description: string } | null {
  // Match the title pattern: **:emoji: Title** or **Title**
  const titleMatch = body.match(/\*\*(?::[a-z_]+:\s*)?([^*]+)\*\*/);
  if (!titleMatch || !titleMatch[1]) {
    return null;
  }

  const title = titleMatch[1].trim();

  // Get the description - everything after the title until the first ---
  const titleEnd = body.indexOf('**', body.indexOf('**') + 2) + 2;
  const separatorIndex = body.indexOf('---');
  const descEnd = separatorIndex > -1 ? separatorIndex : body.length;

  const description = body.slice(titleEnd, descEnd).trim();

  return { title, description };
}

/**
 * Check if a comment body is a Warden-generated comment.
 */
export function isWardenComment(body: string): boolean {
  return body.includes('<sub>warden:') || body.includes('<!-- warden:v1:');
}

/**
 * Fetch all existing Warden review comments for a PR.
 */
export async function fetchExistingWardenComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ExistingComment[]> {
  const comments: ExistingComment[] = [];

  // Fetch review comments (inline comments on code)
  const reviewComments = await octokit.paginate(octokit.pulls.listReviewComments, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  for (const comment of reviewComments) {
    if (!isWardenComment(comment.body)) {
      continue;
    }

    const marker = parseMarker(comment.body);
    const parsed = parseWardenComment(comment.body);

    if (parsed) {
      comments.push({
        id: comment.id,
        path: marker?.path ?? comment.path,
        line: marker?.line ?? comment.line ?? comment.original_line ?? 0,
        title: parsed.title,
        description: parsed.description,
        contentHash: marker?.contentHash ?? generateContentHash(parsed.title, parsed.description),
      });
    }
  }

  return comments;
}

/**
 * Use LLM to identify which findings are semantic duplicates of existing comments.
 * Returns a Set of finding IDs that should be skipped as duplicates.
 */
async function findSemanticDuplicates(
  findings: Finding[],
  existingComments: ExistingComment[],
  apiKey: string
): Promise<Set<string>> {
  if (findings.length === 0 || existingComments.length === 0) {
    return new Set();
  }

  const client = new Anthropic({ apiKey });

  const existingList = existingComments
    .map((c, i) => `${i + 1}. [${c.path}:${c.line}] "${c.title}" - ${c.description}`)
    .join('\n');

  const findingsList = findings
    .map((f, i) => {
      const loc = f.location ? `${f.location.path}:${f.location.startLine}` : 'general';
      return `${i + 1}. [${loc}] "${f.title}" - ${f.description}`;
    })
    .join('\n');

  const prompt = `Compare these code review findings and identify duplicates.

Existing comments:
${existingList}

New findings:
${findingsList}

Return a JSON array of numbers for findings that are DUPLICATES of existing comments.
Only mark as duplicate if they describe the SAME issue at the SAME location (within a few lines).
Different issues at the same location are NOT duplicates.

Return ONLY the JSON array, e.g. [1, 3] or [] if none are duplicates.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const duplicateIndices = JSON.parse(content.text) as number[];
    const duplicateIds = new Set<string>();

    for (const num of duplicateIndices) {
      // Convert 1-based index to 0-based
      const finding = findings[num - 1];
      if (finding) {
        duplicateIds.add(finding.id);
      }
    }

    return duplicateIds;
  } catch (error) {
    console.warn(`LLM deduplication failed, falling back to hash-only: ${error}`);
    return new Set();
  }
}

/**
 * Options for deduplication.
 */
export interface DeduplicateOptions {
  /** Anthropic API key for LLM-based semantic deduplication */
  apiKey?: string;
  /** Skip LLM deduplication and only use exact hash matching */
  hashOnly?: boolean;
}

/**
 * Convert a Finding to an ExistingComment for cross-trigger deduplication.
 * Returns null if the finding has no location.
 */
export function findingToExistingComment(finding: Finding): ExistingComment | null {
  if (!finding.location) {
    return null;
  }

  return {
    id: -1, // Newly posted comments don't have IDs yet
    path: finding.location.path,
    line: finding.location.endLine ?? finding.location.startLine,
    title: finding.title,
    description: finding.description,
    contentHash: generateContentHash(finding.title, finding.description),
  };
}

/**
 * Deduplicate findings against existing Warden comments.
 * Returns only non-duplicate findings.
 *
 * Deduplication is two-pass:
 * 1. Exact content hash match - instant skip
 * 2. LLM semantic comparison for remaining findings (if API key provided)
 */
export async function deduplicateFindings(
  findings: Finding[],
  existingComments: ExistingComment[],
  options: DeduplicateOptions = {}
): Promise<Finding[]> {
  if (findings.length === 0 || existingComments.length === 0) {
    return findings;
  }

  // Build a map of existing comments by location+hash for fast lookup
  // Key format: "path:line:contentHash" to ensure same content at different locations is not deduped
  const existingKeys = new Set(
    existingComments.map((c) => `${c.path}:${c.line}:${c.contentHash}`)
  );

  // First pass: filter out exact matches (same content at same location)
  const hashDedupedFindings: Finding[] = [];
  let exactMatchCount = 0;

  for (const finding of findings) {
    const hash = generateContentHash(finding.title, finding.description);
    const line = finding.location?.endLine ?? finding.location?.startLine ?? 0;
    const path = finding.location?.path ?? '';
    const key = `${path}:${line}:${hash}`;

    if (existingKeys.has(key)) {
      exactMatchCount++;
    } else {
      hashDedupedFindings.push(finding);
    }
  }

  if (exactMatchCount > 0) {
    console.log(`Dedup: ${exactMatchCount} findings matched by content hash`);
  }

  // If hash-only mode, no API key, or no remaining findings, stop here
  if (options.hashOnly || !options.apiKey || hashDedupedFindings.length === 0) {
    return hashDedupedFindings;
  }

  // Second pass: LLM semantic comparison for remaining findings
  const duplicateIds = await findSemanticDuplicates(hashDedupedFindings, existingComments, options.apiKey);

  if (duplicateIds.size > 0) {
    console.log(`Dedup: ${duplicateIds.size} findings identified as semantic duplicates by LLM`);
  }

  return hashDedupedFindings.filter((f) => !duplicateIds.has(f.id));
}
