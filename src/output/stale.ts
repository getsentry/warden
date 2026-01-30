import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from './dedup.js';
import type { Finding, FileChange } from '../types/index.js';
import { generateContentHash } from './dedup.js';

/**
 * Scope of analyzed files in the PR.
 */
export interface AnalyzedScope {
  /** Set of file paths that were in the diff */
  files: Set<string>;
}

/**
 * Build the analyzed scope from file changes.
 */
export function buildAnalyzedScope(fileChanges: FileChange[]): AnalyzedScope {
  return {
    files: new Set(fileChanges.map((f) => f.filename)),
  };
}

/**
 * Check if a comment's file was in the analyzed scope.
 * Only comments on files that were analyzed should be considered for resolution.
 */
export function isInAnalyzedScope(comment: ExistingComment, scope: AnalyzedScope): boolean {
  return scope.files.has(comment.path);
}

/**
 * Check if a finding matches a comment (same location and similar content).
 */
function findingMatchesComment(finding: Finding, comment: ExistingComment): boolean {
  // Must have a location to match
  if (!finding.location) {
    return false;
  }

  // File path must match
  if (finding.location.path !== comment.path) {
    return false;
  }

  // Check line proximity - findings may shift a few lines
  const findingLine = finding.location.endLine ?? finding.location.startLine;
  const lineDiff = Math.abs(findingLine - comment.line);
  if (lineDiff > 5) {
    return false;
  }

  // Check content hash for exact match
  const findingHash = generateContentHash(finding.title, finding.description);
  if (findingHash === comment.contentHash) {
    return true;
  }

  // If hashes don't match exactly, check if the title is similar enough
  // This handles cases where description might have minor changes
  const normalizedFindingTitle = finding.title.toLowerCase().trim();
  const normalizedCommentTitle = comment.title.toLowerCase().trim();
  return normalizedFindingTitle === normalizedCommentTitle;
}

/**
 * Find comments that no longer have matching findings (stale comments).
 * Only considers comments on files that were in the analyzed scope.
 */
export function findStaleComments(
  existingComments: ExistingComment[],
  allFindings: Finding[],
  scope: AnalyzedScope
): ExistingComment[] {
  const staleComments: ExistingComment[] = [];

  for (const comment of existingComments) {
    // Skip comments that don't have thread IDs (can't resolve them)
    if (!comment.threadId) {
      continue;
    }

    // Comments on files NOT in scope are orphaned (file renamed, reverted, etc.)
    if (!isInAnalyzedScope(comment, scope)) {
      staleComments.push(comment);
      continue;
    }

    // Check if any finding matches this comment
    const hasMatchingFinding = allFindings.some((finding) =>
      findingMatchesComment(finding, comment)
    );

    // If no matching finding, this comment is stale
    if (!hasMatchingFinding) {
      staleComments.push(comment);
    }
  }

  return staleComments;
}

const RESOLVE_THREAD_MUTATION = `
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread {
        id
        isResolved
      }
    }
  }
`;

/** Maximum stale comments to resolve per run (matches default maxFindings) */
const MAX_STALE_RESOLUTIONS = 50;

/**
 * Resolve stale comment threads via GraphQL.
 * Returns the number of threads successfully resolved.
 * Limited to MAX_STALE_RESOLUTIONS per run as a safeguard.
 */
export async function resolveStaleComments(
  octokit: Octokit,
  staleComments: ExistingComment[]
): Promise<number> {
  let resolvedCount = 0;

  const commentsToResolve = staleComments.slice(0, MAX_STALE_RESOLUTIONS);
  if (staleComments.length > MAX_STALE_RESOLUTIONS) {
    console.log(
      `Limiting stale comment resolution to ${MAX_STALE_RESOLUTIONS} of ${staleComments.length} comments`
    );
  }

  for (const comment of commentsToResolve) {
    if (!comment.threadId) {
      continue;
    }

    try {
      await octokit.graphql(RESOLVE_THREAD_MUTATION, {
        threadId: comment.threadId,
      });
      resolvedCount++;
    } catch (error) {
      console.warn(`Failed to resolve thread for comment ${comment.id}: ${error}`);
    }
  }

  return resolvedCount;
}
