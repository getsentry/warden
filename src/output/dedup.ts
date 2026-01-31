import { createHash } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
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
 * Existing comment from GitHub (either Warden or external).
 */
export interface ExistingComment {
  id: number;
  path: string;
  line: number;
  title: string;
  description: string;
  contentHash: string;
  /** GraphQL node ID for the review thread (used to resolve stale comments) */
  threadId?: string;
  /** Whether the thread has been resolved (resolved comments are used for dedup but not stale detection) */
  isResolved?: boolean;
  /** Whether this is a Warden-generated comment */
  isWarden?: boolean;
  /** Skills that have already detected this issue (for Warden comments) */
  skills?: string[];
  /** The raw comment body (needed for updating Warden comments) */
  body?: string;
  /** GraphQL node ID for the comment (needed for adding reactions) */
  commentNodeId?: string;
}

/**
 * Type of action to take for a duplicate finding.
 */
export type DuplicateActionType = 'update_warden' | 'react_external';

/**
 * Action to take for a duplicate finding.
 */
export interface DuplicateAction {
  type: DuplicateActionType;
  finding: Finding;
  existingComment: ExistingComment;
  /** Whether this was a hash match or semantic match */
  matchType: 'hash' | 'semantic';
}

/**
 * Result of deduplication with actions for duplicates.
 */
export interface DeduplicateResult {
  /** Findings that are not duplicates - should be posted */
  newFindings: Finding[];
  /** Actions to take for duplicate findings */
  duplicateActions: DuplicateAction[];
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

  // Capture groups are guaranteed to exist when the regex matches
  const [, path, lineStr, contentHash] = match as [string, string, string, string];

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
  // Use non-greedy match to handle titles containing asterisks
  const titleMatch = body.match(/\*\*(?::[a-z_]+:\s*)?(.+?)\*\*/);
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
 * Parse skill names from a Warden comment's attribution line.
 * Handles both single skill: "<sub>warden: skill-name</sub>"
 * And multiple skills: "<sub>warden: skill1, skill2</sub>"
 */
export function parseWardenSkills(body: string): string[] {
  const match = body.match(/<sub>warden:\s*([^<]+)<\/sub>/);
  if (!match || !match[1]) {
    return [];
  }
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Update a Warden comment body to add a new skill to the attribution.
 * Changes "<sub>warden: skill1</sub>" to "<sub>warden: skill1, skill2</sub>"
 * Returns null if skill is already listed.
 */
export function updateWardenCommentBody(body: string, newSkill: string): string | null {
  const existingSkills = parseWardenSkills(body);

  // Don't update if skill already listed
  if (existingSkills.includes(newSkill)) {
    return null;
  }

  const allSkills = [...existingSkills, newSkill].join(', ');
  return body.replace(/<sub>warden:\s*[^<]+<\/sub>/, `<sub>warden: ${allSkills}</sub>`);
}

/** GraphQL response structure for review threads */
interface ReviewThreadNode {
  id: string;
  isResolved: boolean;
  comments: {
    nodes: {
      id: string; // GraphQL node ID (for reactions)
      databaseId: number;
      body: string;
      path: string;
      line: number | null;
      originalLine: number | null;
    }[];
  };
}

interface ReviewThreadsResponse {
  repository?: {
    pullRequest?: {
      reviewThreads: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        nodes: ReviewThreadNode[];
      };
    } | null;
  } | null;
}

const REVIEW_THREADS_QUERY = `
  query($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $prNumber) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isResolved
            comments(first: 1) {
              nodes {
                id
                databaseId
                body
                path
                line
                originalLine
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch all existing review comments for a PR (both Warden and external).
 * Uses GraphQL to get thread IDs for stale comment resolution and node IDs for reactions.
 */
export async function fetchExistingComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ExistingComment[]> {
  const comments: ExistingComment[] = [];

  // Use GraphQL to get thread IDs along with comment data
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: ReviewThreadsResponse = await octokit.graphql(REVIEW_THREADS_QUERY, {
      owner,
      repo,
      prNumber,
      cursor,
    });

    const pullRequest = response.repository?.pullRequest;
    if (!pullRequest) {
      // PR doesn't exist or was deleted
      return comments;
    }

    const threads = pullRequest.reviewThreads;

    for (const thread of threads.nodes) {
      // Get the first comment in the thread
      const firstComment = thread.comments.nodes[0];
      if (!firstComment) {
        continue;
      }

      const isWarden = isWardenComment(firstComment.body);
      const marker = isWarden ? parseMarker(firstComment.body) : null;
      const parsed = parseWardenComment(firstComment.body);

      // For Warden comments, we need parsed title/description
      // For external comments, we extract what we can or use body as description
      const title = parsed?.title ?? '';
      const description = parsed?.description ?? firstComment.body.slice(0, 500);

      comments.push({
        id: firstComment.databaseId,
        path: marker?.path ?? firstComment.path,
        line: marker?.line ?? firstComment.line ?? firstComment.originalLine ?? 0,
        title,
        description,
        contentHash: marker?.contentHash ?? generateContentHash(title, description),
        threadId: thread.id,
        isResolved: thread.isResolved,
        isWarden,
        skills: isWarden ? parseWardenSkills(firstComment.body) : undefined,
        body: firstComment.body,
        commentNodeId: firstComment.id,
      });
    }

    hasNextPage = threads.pageInfo.hasNextPage;
    cursor = threads.pageInfo.endCursor;
  }

  return comments;
}

/**
 * @deprecated Use fetchExistingComments instead
 */
export async function fetchExistingWardenComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ExistingComment[]> {
  const allComments = await fetchExistingComments(octokit, owner, repo, prNumber);
  return allComments.filter((c) => c.isWarden);
}

/** Schema for validating LLM deduplication response with matched indices */
const DuplicateMatchesSchema = z.array(
  z.object({
    findingIndex: z.number().int(),
    existingIndex: z.number().int(),
  })
);

/**
 * Use LLM to identify which findings are semantic duplicates of existing comments.
 * Returns a Map of finding ID to matched ExistingComment.
 */
async function findSemanticDuplicates(
  findings: Finding[],
  existingComments: ExistingComment[],
  apiKey: string
): Promise<Map<string, ExistingComment>> {
  if (findings.length === 0 || existingComments.length === 0) {
    return new Map();
  }

  const client = new Anthropic({ apiKey });

  const existingList = existingComments
    .map((c, i) => `${i + 1}. [${c.path}:${c.line}] "${c.title}" - ${c.description}`)
    .join('\n');

  const findingsList = findings
    .map((f, i) => {
      const line = f.location?.endLine ?? f.location?.startLine;
      const loc = f.location ? `${f.location.path}:${line}` : 'general';
      return `${i + 1}. [${loc}] "${f.title}" - ${f.description}`;
    })
    .join('\n');

  const prompt = `Compare these code review findings and identify duplicates.

Existing comments:
${existingList}

New findings:
${findingsList}

Return a JSON array of objects identifying which findings are DUPLICATES of which existing comments.
Only mark as duplicate if they describe the SAME issue at the SAME location (within a few lines).
Different issues at the same location are NOT duplicates.

Return ONLY the JSON array in this format:
[{"findingIndex": 1, "existingIndex": 2}]
where findingIndex is the 1-based index of the new finding and existingIndex is the 1-based index of the matching existing comment.
Return [] if none are duplicates.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const parsed = DuplicateMatchesSchema.parse(JSON.parse(content.text));
    const matches = new Map<string, ExistingComment>();

    for (const match of parsed) {
      const finding = findings[match.findingIndex - 1];
      const existing = existingComments[match.existingIndex - 1];
      if (finding && existing) {
        matches.set(finding.id, existing);
      }
    }

    return matches;
  } catch (error) {
    console.warn(`LLM deduplication failed, falling back to hash-only: ${error}`);
    return new Map();
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
  /** Current skill name (for updating Warden comment attribution) */
  currentSkill?: string;
}

const ADD_REACTION_MUTATION = `
  mutation($subjectId: ID!, $content: ReactionContent!) {
    addReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction {
        content
      }
    }
  }
`;

/**
 * Update an existing Warden PR review comment via REST API.
 */
export async function updateWardenComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commentId: number,
  newBody: string
): Promise<void> {
  await octokit.pulls.updateReviewComment({
    owner,
    repo,
    comment_id: commentId,
    body: newBody,
  });
}

/**
 * Add a reaction to an existing PR review comment.
 * Uses GraphQL to handle review comments.
 */
export async function addReactionToComment(
  octokit: Octokit,
  commentNodeId: string,
  reaction: 'THUMBS_UP' | 'EYES' = 'EYES'
): Promise<void> {
  await octokit.graphql(ADD_REACTION_MUTATION, {
    subjectId: commentNodeId,
    content: reaction,
  });
}

/**
 * Process duplicate actions - update Warden comments and add reactions.
 * Returns counts of actions taken for logging.
 */
export async function processDuplicateActions(
  octokit: Octokit,
  owner: string,
  repo: string,
  actions: DuplicateAction[],
  currentSkill: string
): Promise<{ updated: number; reacted: number; skipped: number; failed: number }> {
  let updated = 0;
  let reacted = 0;
  let skipped = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      if (action.type === 'update_warden') {
        if (!action.existingComment.body) {
          skipped++;
          continue;
        }
        const newBody = updateWardenCommentBody(action.existingComment.body, currentSkill);
        // Only update if body actually changed (skill wasn't already listed)
        if (newBody) {
          await updateWardenComment(octokit, owner, repo, action.existingComment.id, newBody);
          updated++;
        } else {
          skipped++;
        }
      } else if (action.type === 'react_external') {
        if (!action.existingComment.commentNodeId) {
          skipped++;
          continue;
        }
        await addReactionToComment(octokit, action.existingComment.commentNodeId);
        reacted++;
      }
    } catch (error) {
      console.warn(`Failed to process duplicate action for ${action.finding.title}: ${error}`);
      failed++;
    }
  }

  return { updated, reacted, skipped, failed };
}

/**
 * Convert a Finding to an ExistingComment for cross-trigger deduplication.
 * Returns null if the finding has no location.
 */
export function findingToExistingComment(finding: Finding, skill?: string): ExistingComment | null {
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
    isWarden: true,
    skills: skill ? [skill] : [],
  };
}

/**
 * Deduplicate findings against existing comments.
 * Returns non-duplicate findings and actions to take for duplicates.
 *
 * Deduplication is two-pass:
 * 1. Exact content hash match - instant match
 * 2. LLM semantic comparison for remaining findings (if API key provided)
 *
 * For duplicates:
 * - If matching a Warden comment: action to update attribution with new skill
 * - If matching an external comment: action to add reaction
 */
export async function deduplicateFindings(
  findings: Finding[],
  existingComments: ExistingComment[],
  options: DeduplicateOptions = {}
): Promise<DeduplicateResult> {
  if (findings.length === 0 || existingComments.length === 0) {
    return { newFindings: findings, duplicateActions: [] };
  }

  // Build a map of existing comments by location+hash for fast lookup
  const existingByKey = new Map<string, ExistingComment>();
  for (const c of existingComments) {
    const key = `${c.path}:${c.line}:${c.contentHash}`;
    existingByKey.set(key, c);
  }

  // First pass: find exact matches (same content at same location)
  const hashDedupedFindings: Finding[] = [];
  const duplicateActions: DuplicateAction[] = [];

  for (const finding of findings) {
    const hash = generateContentHash(finding.title, finding.description);
    const line = finding.location?.endLine ?? finding.location?.startLine ?? 0;
    const path = finding.location?.path ?? '';
    const key = `${path}:${line}:${hash}`;

    const matchingComment = existingByKey.get(key);
    if (matchingComment) {
      duplicateActions.push({
        type: matchingComment.isWarden ? 'update_warden' : 'react_external',
        finding,
        existingComment: matchingComment,
        matchType: 'hash',
      });
    } else {
      hashDedupedFindings.push(finding);
    }
  }

  if (duplicateActions.length > 0) {
    console.log(`Dedup: ${duplicateActions.length} findings matched by content hash`);
  }

  // If hash-only mode, no API key, or no remaining findings, stop here
  if (options.hashOnly || !options.apiKey || hashDedupedFindings.length === 0) {
    return { newFindings: hashDedupedFindings, duplicateActions };
  }

  // Second pass: LLM semantic comparison for remaining findings
  const semanticMatches = await findSemanticDuplicates(hashDedupedFindings, existingComments, options.apiKey);

  if (semanticMatches.size > 0) {
    console.log(`Dedup: ${semanticMatches.size} findings identified as semantic duplicates by LLM`);
  }

  const newFindings: Finding[] = [];
  for (const finding of hashDedupedFindings) {
    const matchingComment = semanticMatches.get(finding.id);
    if (matchingComment) {
      duplicateActions.push({
        type: matchingComment.isWarden ? 'update_warden' : 'react_external',
        finding,
        existingComment: matchingComment,
        matchType: 'semantic',
      });
    } else {
      newFindings.push(finding);
    }
  }

  return { newFindings, duplicateActions };
}
