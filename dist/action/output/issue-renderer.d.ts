import type { SkillReport } from '../types/index.js';
export interface IssueRenderOptions {
    /** Commit SHA for linking to code */
    commitSha: string;
    /** When the scan was run */
    runTimestamp: Date;
    /** Repository owner for constructing file links */
    repoOwner?: string;
    /** Repository name for constructing file links */
    repoName?: string;
}
/**
 * Render skill reports as a GitHub issue body.
 */
export declare function renderIssueBody(reports: SkillReport[], options: IssueRenderOptions): string;
/**
 * Render a brief status update for when no new findings are found.
 */
export declare function renderNoFindingsUpdate(commitSha: string, runTimestamp: Date): string;
//# sourceMappingURL=issue-renderer.d.ts.map