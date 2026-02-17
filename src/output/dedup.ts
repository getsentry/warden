import { createHash } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import { z } from 'zod';
import type { Finding, UsageStats } from '../types/index.js';
import { findingLine, compareFindingPriority } from '../types/index.js';
import { callHaiku } from '../sdk/haiku.js';
import { mergeGroupLocations } from '../sdk/extract.js';

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
  /** Usage from semantic dedup LLM call, if invoked */
  dedupUsage?: UsageStats;
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
  if (!match || match.length < 4) {
    return null;
  }

  const path = match[1];
  const lineStr = match[2];
  const contentHash = match[3];

  // Validate that all capture groups exist (defensive, should always be true when regex matches)
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
 * Supports both old format (<sub>warden: skill</sub>) and new format (<sub>Identified by Warden via `skill`</sub>).
 */
export function isWardenComment(body: string): boolean {
  return body.includes('<sub>warden:') || body.includes('<sub>Identified by Warden via') || body.includes('<!-- warden:v1:');
}

/**
 * Parse skill names from a Warden comment's attribution line.
 * Supports both old format: "<sub>warden: skill1, skill2</sub>"
 * And new format: "<sub>Identified by Warden via `skill1`, `skill2` · severity</sub>"
 */
export function parseWardenSkills(body: string): string[] {
  // Try new format first: <sub>Identified by Warden via `skill1`, `skill2` · severity</sub>
  // Extract the portion between "via " and " ·" (or end of sub tag)
  const newFormatMatch = body.match(/<sub>Identified by Warden via ([^·<]+)/);
  if (newFormatMatch?.[1]) {
    // Extract all backtick-quoted skill names
    const skillMatches = newFormatMatch[1].matchAll(/`([^`]+)`/g);
    const skills: string[] = [];
    for (const m of skillMatches) {
      if (m[1]) skills.push(m[1]);
    }
    if (skills.length > 0) {
      return skills;
    }
  }

  // Fall back to old format: <sub>warden: skill1, skill2</sub>
  const oldMatch = body.match(/<sub>warden:\s*([^<]+)<\/sub>/);
  if (!oldMatch?.[1]) {
    return [];
  }
  return oldMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Update a Warden comment body to add a new skill to the attribution.
 * Old format: Changes "<sub>warden: skill1</sub>" to "<sub>warden: skill1, skill2</sub>"
 * New format: Changes "<sub>Identified by Warden via `skill1` · severity</sub>"
 *             to "<sub>Identified by Warden via `skill1`, `skill2` · severity</sub>"
 * Returns null if skill is already listed or if no attribution tag exists.
 */
export function updateWardenCommentBody(body: string, newSkill: string): string | null {
  const existingSkills = parseWardenSkills(body);

  // If no existing attribution tag exists, we can't update it
  if (existingSkills.length === 0) {
    return null;
  }

  // Don't update if skill already listed
  if (existingSkills.includes(newSkill)) {
    return null;
  }

  // Check if it's the new format
  const newFormatMatch = body.match(/<sub>Identified by Warden via `[^`]+`/);
  if (newFormatMatch) {
    const existingSkillsFormatted = existingSkills.map((s) => `\`${s}\``).join(', ');
    // Extract the suffix (metadata) starting from the · separator, not from the skill list
    const subTagMatch = body.match(/<sub>Identified by Warden via ([^<]+)<\/sub>/);
    const fullContent = subTagMatch?.[1] || '';
    const separatorIndex = fullContent.indexOf(' · ');
    const suffix = separatorIndex >= 0 ? fullContent.slice(separatorIndex) : '';
    return body.replace(
      /<sub>Identified by Warden via [^<]+<\/sub>/,
      () => `<sub>Identified by Warden via ${existingSkillsFormatted}, \`${newSkill}\`${suffix}</sub>`
    );
  }

  // Old format: <sub>warden: skill1, skill2</sub>
  const allSkills = [...existingSkills, newSkill].join(', ');
  // Use a replacer function to avoid special $ character interpretation in skill names
  return body.replace(/<sub>warden:\s*[^<]+<\/sub>/, () => `<sub>warden: ${allSkills}</sub>`);
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
 * Result from semantic dedup LLM call.
 */
interface SemanticDuplicateResult {
  matches: Map<string, ExistingComment>;
  usage?: UsageStats;
}

/**
 * Use LLM to identify which findings are semantic duplicates of existing comments.
 * Returns a Map of finding ID to matched ExistingComment, plus usage stats.
 */
async function findSemanticDuplicates(
  findings: Finding[],
  existingComments: ExistingComment[],
  apiKey: string
): Promise<SemanticDuplicateResult> {
  if (findings.length === 0 || existingComments.length === 0) {
    return { matches: new Map() };
  }

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

  const result = await callHaiku({
    apiKey,
    prompt,
    schema: DuplicateMatchesSchema,
    maxTokens: 512,
  });

  if (!result.success) {
    console.warn(`LLM deduplication failed, falling back to hash-only: ${result.error}`);
    return { matches: new Map(), usage: result.usage };
  }

  const matches = new Map<string, ExistingComment>();
  for (const match of result.data) {
    const finding = findings[match.findingIndex - 1];
    const existing = existingComments[match.existingIndex - 1];
    if (finding && existing) {
      matches.set(finding.id, existing);
    }
  }

  return { matches, usage: result.usage };
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
          // Update in-memory body so subsequent triggers see the updated content
          action.existingComment.body = newBody;
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

// -----------------------------------------------------------------------------
// Intra-batch consolidation
// -----------------------------------------------------------------------------

const PROXIMITY_THRESHOLD = 5;

/**
 * Result from consolidating findings within a single batch.
 */
export interface ConsolidateResult {
  findings: Finding[];
  removedCount: number;
  usage?: UsageStats;
}

/** Schema for LLM consolidation response: groups of finding indices that share a root cause. */
const ConsolidationGroupsSchema = z.array(
  z.array(z.number().int())
);

/**
 * Pick the best finding from a group and merge additional locations from losers.
 * Highest severity wins, then confidence, then position.
 * Locations from losers are preserved in winner.additionalLocations.
 */
function pickAndMergeWinner(group: Finding[]): Finding {
  const sorted = [...group].sort(compareFindingPriority);
  const winner = mergeGroupLocations(sorted);
  if (!winner) throw new Error('pickAndMergeWinner called with empty group');
  return winner;
}

/**
 * Group findings by file path, then identify clusters where findings are within
 * PROXIMITY_THRESHOLD lines of each other. Returns only clusters with 2+ findings.
 */
function findProximityClusters(findings: Finding[]): Finding[][] {
  // Group by file path
  const byPath = new Map<string, Finding[]>();
  for (const f of findings) {
    const path = f.location?.path ?? '';
    const existing = byPath.get(path);
    if (existing) {
      existing.push(f);
    } else {
      byPath.set(path, [f]);
    }
  }

  const clusters: Finding[][] = [];

  for (const group of byPath.values()) {
    if (group.length < 2) continue;

    // Sort by line number
    const sorted = [...group].sort((a, b) => findingLine(a) - findingLine(b));

    // Single-linkage clustering: consecutive findings within PROXIMITY_THRESHOLD
    // lines of each other are grouped together.
    const first = sorted[0];
    if (!first) continue;
    let current: Finding[] = [first];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!prev || !curr) continue;

      if (findingLine(curr) - findingLine(prev) <= PROXIMITY_THRESHOLD) {
        current.push(curr);
      } else {
        if (current.length >= 2) clusters.push(current);
        current = [curr];
      }
    }
    if (current.length >= 2) clusters.push(current);
  }

  return clusters;
}

/**
 * Consolidate findings within a single batch to remove duplicates that describe
 * the same root cause. Three-phase approach:
 *
 * 1. Hash dedup: remove exact duplicates (same path:line:contentHash)
 * 2. Proximity grouping: identify clusters of findings within 5 lines of each other
 * 3. LLM consolidation: ask Haiku to group findings by root cause (only when proximity matches exist)
 *
 * For each group, keeps the highest-severity finding.
 */
export async function consolidateBatchFindings(
  findings: Finding[],
  options: { apiKey?: string; hashOnly?: boolean } = {}
): Promise<ConsolidateResult> {
  if (findings.length <= 1) {
    return { findings, removedCount: 0 };
  }

  // Phase 1: Hash dedup within batch
  const seen = new Set<string>();
  const hashDeduped: Finding[] = [];

  for (const f of findings) {
    const hash = generateContentHash(f.title, f.description);
    const line = findingLine(f);
    const path = f.location?.path ?? '';
    const key = `${path}:${line}:${hash}`;

    if (seen.has(key)) continue;
    seen.add(key);
    hashDeduped.push(f);
  }

  const hashRemovedCount = findings.length - hashDeduped.length;

  if (hashRemovedCount > 0) {
    console.log(`Consolidate: ${hashRemovedCount} exact duplicate findings removed within batch`);
  }

  // Phase 2: Proximity grouping
  const clusters = findProximityClusters(hashDeduped);

  // If no proximity clusters or hash-only mode or no API key, return hash-deduped results
  if (clusters.length === 0 || options.hashOnly || !options.apiKey) {
    return { findings: hashDeduped, removedCount: hashRemovedCount };
  }

  // Phase 3: LLM consolidation for proximity clusters
  // Only send clustered findings to the LLM (deduplicated across clusters)
  const clusteredList = [...new Set(clusters.flat())];
  const findingsList = clusteredList
    .map((f, i) => {
      const line = findingLine(f);
      const loc = f.location ? `${f.location.path}:${line}` : 'general';
      return `${i + 1}. [${loc}] (${f.severity}) "${f.title}" - ${f.description}`;
    })
    .join('\n');

  const prompt = `You are deduplicating code review findings. Group findings that describe the SAME root cause or bug.

Findings:
${findingsList}

Return a JSON array of arrays, where each inner array contains the 1-based indices of findings that describe the same root cause.
Only group findings that are truly about the same underlying issue. Findings about different issues should NOT be grouped even if they're nearby.
Singletons (findings with no duplicates) should not appear in any group.

Return ONLY the JSON array. Return [] if no findings share a root cause.`;

  const result = await callHaiku({
    apiKey: options.apiKey,
    prompt,
    schema: ConsolidationGroupsSchema,
    maxTokens: 512,
  });

  if (!result.success) {
    console.warn(`LLM batch consolidation failed, keeping all findings: ${result.error}`);
    return { findings: hashDeduped, removedCount: hashRemovedCount, usage: result.usage };
  }

  // Process LLM groups: for each group, keep the winner and drop the rest
  const droppedFindings = new Set<Finding>();
  const replacements = new Map<Finding, Finding>();

  for (const group of result.data) {
    // Deduplicate indices to prevent the winner from being dropped
    const uniqueIndices = [...new Set(group)];
    if (uniqueIndices.length < 2) continue;

    // Convert 1-based indices to findings, skipping already-dropped ones
    const groupFindings = uniqueIndices
      .map((idx) => clusteredList[idx - 1])
      .filter((f): f is Finding => f !== undefined && !droppedFindings.has(f));

    if (groupFindings.length < 2) continue;

    const sorted = [...groupFindings].sort(compareFindingPriority);
    const original = sorted[0];
    if (!original) continue;
    // Save original references before substitution for drop tracking
    const originalRefs = [...groupFindings];
    // Substitute any existing replacements to preserve locations from prior groups.
    // This covers both winners and losers that accumulated locations earlier.
    for (let i = 0; i < groupFindings.length; i++) {
      const f = groupFindings[i];
      if (!f) continue;
      const existing = replacements.get(f);
      if (existing) groupFindings[i] = existing;
    }
    const winner = pickAndMergeWinner(groupFindings);
    // Track replacement since mergeGroupLocations returns a copy
    replacements.set(original, winner);
    // Track original findings (not substituted replacements) so the final
    // filter on original references correctly removes dropped items.
    for (const f of originalRefs) {
      if (f !== original) {
        droppedFindings.add(f);
      }
    }
  }

  if (droppedFindings.size === 0) {
    return { findings: hashDeduped, removedCount: hashRemovedCount, usage: result.usage };
  }

  const consolidated = hashDeduped
    .filter((f) => !droppedFindings.has(f))
    .map((f) => replacements.get(f) ?? f);
  const totalRemoved = hashRemovedCount + droppedFindings.size;

  console.log(`Consolidate: ${droppedFindings.size} findings merged by LLM (same root cause)`);

  return { findings: consolidated, removedCount: totalRemoved, usage: result.usage };
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

  // Build maps of existing comments by location+hash for fast lookup
  const existingByKey = new Map<string, ExistingComment>();
  const wardenByKey = new Map<string, ExistingComment>();
  for (const c of existingComments) {
    const key = `${c.path}:${c.line}:${c.contentHash}`;
    existingByKey.set(key, c);
    if (c.isWarden) {
      wardenByKey.set(key, c);
    }
  }

  // First pass: find exact matches (same content at same location)
  const hashDedupedFindings: Finding[] = [];
  const duplicateActions: DuplicateAction[] = [];

  for (const finding of findings) {
    const hash = generateContentHash(finding.title, finding.description);
    const line = finding.location?.endLine ?? finding.location?.startLine ?? 0;
    const path = finding.location?.path ?? '';
    const key = `${path}:${line}:${hash}`;

    let matchingComment = existingByKey.get(key);

    // If no primary location match, check additional locations against our own comments.
    // This handles winner-flip scenarios where a merged finding's primary location changed
    // between runs but an additional location matches a previous Warden comment.
    if (!matchingComment && finding.additionalLocations) {
      for (const loc of finding.additionalLocations) {
        const addlLine = loc.endLine ?? loc.startLine;
        const addlKey = `${loc.path}:${addlLine}:${hash}`;
        const wardenMatch = wardenByKey.get(addlKey);
        if (wardenMatch) {
          matchingComment = wardenMatch;
          break;
        }
      }
    }

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
  const semanticResult = await findSemanticDuplicates(hashDedupedFindings, existingComments, options.apiKey);

  if (semanticResult.matches.size > 0) {
    console.log(`Dedup: ${semanticResult.matches.size} findings identified as semantic duplicates by LLM`);
  }

  const newFindings: Finding[] = [];
  for (const finding of hashDedupedFindings) {
    const matchingComment = semanticResult.matches.get(finding.id);
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

  return { newFindings, duplicateActions, dedupUsage: semanticResult.usage };
}
