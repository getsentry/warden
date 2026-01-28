import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Octokit } from '@octokit/rest';
import type { SkillReport, Finding } from '../types/index.js';
import { renderIssueBody, renderNoFindingsUpdate } from './issue-renderer.js';
import { parsePatch } from '../diff/parser.js';

export interface IssueResult {
  issueNumber: number;
  issueUrl: string;
  created: boolean; // true if new, false if updated
}

export interface CreateIssueOptions {
  title: string;
  labels?: string[];
  commitSha: string;
}

/**
 * Create or update a GitHub issue with findings.
 * Searches for existing open issue by title prefix, updates if found.
 */
export async function createOrUpdateIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  reports: SkillReport[],
  options: CreateIssueOptions
): Promise<IssueResult | null> {
  const { title, labels, commitSha } = options;
  const allFindings = reports.flatMap((r) => r.findings);
  const now = new Date();

  // Search for existing open issue with matching title
  const existingIssue = await findExistingIssue(octokit, owner, repo, title);

  // Render the issue body
  const body = allFindings.length > 0
    ? renderIssueBody(reports, {
        commitSha,
        runTimestamp: now,
        repoOwner: owner,
        repoName: repo,
      })
    : renderNoFindingsUpdate(commitSha, now);

  if (existingIssue) {
    // Update existing issue
    await octokit.issues.update({
      owner,
      repo,
      issue_number: existingIssue.number,
      body,
    });

    // Update labels if specified
    if (labels && labels.length > 0) {
      await octokit.issues.setLabels({
        owner,
        repo,
        issue_number: existingIssue.number,
        labels,
      });
    }

    return {
      issueNumber: existingIssue.number,
      issueUrl: existingIssue.html_url,
      created: false,
    };
  }

  // Skip creating new issue if no findings
  if (allFindings.length === 0) {
    return null;
  }

  // Create new issue
  const { data: newIssue } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });

  return {
    issueNumber: newIssue.number,
    issueUrl: newIssue.html_url,
    created: true,
  };
}

async function findExistingIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string
): Promise<{ number: number; html_url: string } | null> {
  try {
    // Search for open issues with exact title match
    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });

    const matching = issues.find((issue) => issue.title === title);
    return matching ? { number: matching.number, html_url: matching.html_url } : null;
  } catch {
    return null;
  }
}

export interface FixPRResult {
  prNumber: number;
  prUrl: string;
  branch: string;
  fixCount: number;
}

export interface CreateFixPROptions {
  branchPrefix: string;
  baseBranch: string;
  baseSha: string;
  repoPath: string;
  triggerName: string;
}

/**
 * Create a PR with fixes applied.
 * Uses GitHub Git API to create branch, apply changes, and open PR.
 */
export async function createFixPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  findings: Finding[],
  options: CreateFixPROptions
): Promise<FixPRResult | null> {
  const { branchPrefix, baseBranch, baseSha, repoPath, triggerName } = options;

  // Collect fixable findings (have suggestedFix.diff and location.path)
  const fixable = findings.filter(
    (f) => f.suggestedFix?.diff && f.location?.path
  );

  if (fixable.length === 0) {
    return null;
  }

  // Group fixes by file
  const fixesByFile = new Map<string, Finding[]>();
  for (const finding of fixable) {
    // We know location exists because of the filter above
    const path = finding.location?.path;
    if (!path) continue;
    const existing = fixesByFile.get(path) ?? [];
    existing.push(finding);
    fixesByFile.set(path, existing);
  }

  // Generate branch name with timestamp
  const timestamp = Date.now();
  const safeTriggerName = triggerName.replace(/[^a-zA-Z0-9-]/g, '-');
  const branchName = `${branchPrefix}/${safeTriggerName}-${timestamp}`;

  // Apply fixes and create blobs for modified files
  const treeItems: {
    path: string;
    mode: '100644';
    type: 'blob';
    sha: string;
  }[] = [];

  let fixCount = 0;

  for (const [filePath, fileFindings] of fixesByFile) {
    try {
      // Read current file content
      const fullPath = join(repoPath, filePath);
      let content = readFileSync(fullPath, 'utf-8');

      // Sort findings by line number descending to apply from bottom to top
      const sortedFindings = [...fileFindings].sort((a, b) => {
        const aLine = a.location?.startLine ?? 0;
        const bLine = b.location?.startLine ?? 0;
        return bLine - aLine;
      });

      // Apply each fix
      for (const finding of sortedFindings) {
        const diff = finding.suggestedFix?.diff;
        if (!diff) continue;
        try {
          content = applyDiffToContent(content, diff);
          fixCount++;
        } catch (err) {
          console.error(`Failed to apply fix for ${finding.title}: ${err}`);
        }
      }

      // Create blob with modified content
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      });

      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    } catch (err) {
      console.error(`Failed to process fixes for ${filePath}: ${err}`);
    }
  }

  if (treeItems.length === 0 || fixCount === 0) {
    return null;
  }

  // Create tree with new blobs
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseSha,
    tree: treeItems,
  });

  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: `fix: Apply ${fixCount} automated ${fixCount === 1 ? 'fix' : 'fixes'} from Warden\n\nTrigger: ${triggerName}\n\nCo-Authored-By: Warden <noreply@getsentry.com>`,
    tree: tree.sha,
    parents: [baseSha],
  });

  // Create branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: commit.sha,
  });

  // Create PR
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: `fix: Warden automated fixes for ${triggerName}`,
    head: branchName,
    base: baseBranch,
    body: [
      '## Summary',
      '',
      `This PR contains ${fixCount} automated ${fixCount === 1 ? 'fix' : 'fixes'} generated by Warden.`,
      '',
      '### Applied Fixes',
      '',
      ...fixable.map((f) => {
        const path = f.location?.path ?? 'unknown';
        const line = f.location?.startLine ?? 0;
        return `- **${f.title}** (${path}:${line})`;
      }),
      '',
      '---',
      '*Generated by [Warden](https://github.com/getsentry/warden)*',
    ].join('\n'),
  });

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    branch: branchName,
    fixCount,
  };
}

/**
 * Apply a unified diff to file content.
 * Returns the modified content.
 */
function applyDiffToContent(content: string, diff: string): string {
  const hunks = parsePatch(diff);
  if (hunks.length === 0) {
    throw new Error('No valid hunks found in diff');
  }

  const lines = content.split('\n');

  // Sort hunks by oldStart in descending order to apply from bottom to top
  const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of sortedHunks) {
    // Parse hunk lines into operations
    const oldLines: string[] = [];
    const newLines: string[] = [];

    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        oldLines.push(line.slice(1));
      } else if (line.startsWith('+')) {
        newLines.push(line.slice(1));
      } else if (line.startsWith(' ') || line === '') {
        // Context line - should match in both
        const contextLine = line.startsWith(' ') ? line.slice(1) : line;
        oldLines.push(contextLine);
        newLines.push(contextLine);
      }
    }

    // The start index is 0-based (hunk.oldStart is 1-based)
    const startIndex = hunk.oldStart - 1;

    // Verify the old lines match (context check)
    for (let i = 0; i < oldLines.length; i++) {
      const lineIndex = startIndex + i;
      if (lineIndex >= lines.length) {
        throw new Error(`Hunk context mismatch: line ${lineIndex + 1} doesn't exist`);
      }
      if (lines[lineIndex] !== oldLines[i]) {
        throw new Error(
          `Hunk context mismatch at line ${lineIndex + 1}: ` +
          `expected "${oldLines[i]}", got "${lines[lineIndex]}"`
        );
      }
    }

    // Replace the old lines with new lines
    lines.splice(startIndex, oldLines.length, ...newLines);
  }

  return lines.join('\n');
}
