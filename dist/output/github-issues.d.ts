import type { Octokit } from '@octokit/rest';
import type { SkillReport, Finding } from '../types/index.js';
export interface IssueResult {
    issueNumber: number;
    issueUrl: string;
    created: boolean;
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
export declare function createOrUpdateIssue(octokit: Octokit, owner: string, repo: string, reports: SkillReport[], options: CreateIssueOptions): Promise<IssueResult | null>;
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
export declare function createFixPR(octokit: Octokit, owner: string, repo: string, findings: Finding[], options: CreateFixPROptions): Promise<FixPRResult | null>;
//# sourceMappingURL=github-issues.d.ts.map