import { createHash } from 'node:crypto';
import { z } from 'zod';
import { callHaiku } from '../sdk/haiku.js';
/**
 * Generate a short content hash from title and description.
 * Used for exact-match deduplication.
 */
export function generateContentHash(title, description) {
    const content = `${title}\n${description}`;
    return createHash('sha256').update(content).digest('hex').slice(0, 8);
}
/**
 * Generate the marker HTML comment to embed in comment body.
 * Format: <!-- warden:v1:{path}:{line}:{contentHash} -->
 */
export function generateMarker(path, line, contentHash) {
    return `<!-- warden:v1:${path}:${line}:${contentHash} -->`;
}
/**
 * Parse a Warden marker from a comment body.
 * Returns null if no valid marker is found.
 */
export function parseMarker(body) {
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
export function parseWardenComment(body) {
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
export function isWardenComment(body) {
    return body.includes('<sub>warden:') || body.includes('<sub>Identified by Warden via') || body.includes('<!-- warden:v1:');
}
/**
 * Parse skill names from a Warden comment's attribution line.
 * Supports both old format: "<sub>warden: skill1, skill2</sub>"
 * And new format: "<sub>Identified by Warden via `skill1`, `skill2` · severity</sub>"
 */
export function parseWardenSkills(body) {
    // Try new format first: <sub>Identified by Warden via `skill1`, `skill2` · severity</sub>
    // Extract the portion between "via " and " ·" (or end of sub tag)
    const newFormatMatch = body.match(/<sub>Identified by Warden via ([^·<]+)/);
    if (newFormatMatch?.[1]) {
        // Extract all backtick-quoted skill names
        const skillMatches = newFormatMatch[1].matchAll(/`([^`]+)`/g);
        const skills = [];
        for (const m of skillMatches) {
            if (m[1])
                skills.push(m[1]);
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
export function updateWardenCommentBody(body, newSkill) {
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
        return body.replace(/<sub>Identified by Warden via [^<]+<\/sub>/, () => `<sub>Identified by Warden via ${existingSkillsFormatted}, \`${newSkill}\`${suffix}</sub>`);
    }
    // Old format: <sub>warden: skill1, skill2</sub>
    const allSkills = [...existingSkills, newSkill].join(', ');
    // Use a replacer function to avoid special $ character interpretation in skill names
    return body.replace(/<sub>warden:\s*[^<]+<\/sub>/, () => `<sub>warden: ${allSkills}</sub>`);
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
export async function fetchExistingComments(octokit, owner, repo, prNumber) {
    const comments = [];
    // Use GraphQL to get thread IDs along with comment data
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
        const response = await octokit.graphql(REVIEW_THREADS_QUERY, {
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
export async function fetchExistingWardenComments(octokit, owner, repo, prNumber) {
    const allComments = await fetchExistingComments(octokit, owner, repo, prNumber);
    return allComments.filter((c) => c.isWarden);
}
/** Schema for validating LLM deduplication response with matched indices */
const DuplicateMatchesSchema = z.array(z.object({
    findingIndex: z.number().int(),
    existingIndex: z.number().int(),
}));
/**
 * Use LLM to identify which findings are semantic duplicates of existing comments.
 * Returns a Map of finding ID to matched ExistingComment, plus usage stats.
 */
async function findSemanticDuplicates(findings, existingComments, apiKey) {
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
    const matches = new Map();
    for (const match of result.data) {
        const finding = findings[match.findingIndex - 1];
        const existing = existingComments[match.existingIndex - 1];
        if (finding && existing) {
            matches.set(finding.id, existing);
        }
    }
    return { matches, usage: result.usage };
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
export async function updateWardenComment(octokit, owner, repo, commentId, newBody) {
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
export async function addReactionToComment(octokit, commentNodeId, reaction = 'EYES') {
    await octokit.graphql(ADD_REACTION_MUTATION, {
        subjectId: commentNodeId,
        content: reaction,
    });
}
/**
 * Process duplicate actions - update Warden comments and add reactions.
 * Returns counts of actions taken for logging.
 */
export async function processDuplicateActions(octokit, owner, repo, actions, currentSkill) {
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
                }
                else {
                    skipped++;
                }
            }
            else if (action.type === 'react_external') {
                if (!action.existingComment.commentNodeId) {
                    skipped++;
                    continue;
                }
                await addReactionToComment(octokit, action.existingComment.commentNodeId);
                reacted++;
            }
        }
        catch (error) {
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
export function findingToExistingComment(finding, skill) {
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
export async function deduplicateFindings(findings, existingComments, options = {}) {
    if (findings.length === 0 || existingComments.length === 0) {
        return { newFindings: findings, duplicateActions: [] };
    }
    // Build a map of existing comments by location+hash for fast lookup
    const existingByKey = new Map();
    for (const c of existingComments) {
        const key = `${c.path}:${c.line}:${c.contentHash}`;
        existingByKey.set(key, c);
    }
    // First pass: find exact matches (same content at same location)
    const hashDedupedFindings = [];
    const duplicateActions = [];
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
        }
        else {
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
    const newFindings = [];
    for (const finding of hashDedupedFindings) {
        const matchingComment = semanticResult.matches.get(finding.id);
        if (matchingComment) {
            duplicateActions.push({
                type: matchingComment.isWarden ? 'update_warden' : 'react_external',
                finding,
                existingComment: matchingComment,
                matchType: 'semantic',
            });
        }
        else {
            newFindings.push(finding);
        }
    }
    return { newFindings, duplicateActions, dedupUsage: semanticResult.usage };
}
//# sourceMappingURL=dedup.js.map