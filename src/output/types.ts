import type { SeverityThreshold, Finding } from '../types/index.js';

export interface GitHubComment {
  body: string;
  path?: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
  start_line?: number;
  start_side?: 'LEFT' | 'RIGHT';
}

export interface GitHubReview {
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body: string;
  comments: GitHubComment[];
}

export interface RenderResult {
  review?: GitHubReview;
  summaryComment: string;
}

export interface RenderOptions {
  includeSuggestions?: boolean;
  maxFindings?: number;
  groupByFile?: boolean;
  extraLabels?: string[];
  /** Only include findings at or above this severity level in rendered output. Use 'off' to disable comments. */
  commentOn?: SeverityThreshold;
  /** Fail threshold - determines REQUEST_CHANGES vs COMMENT for PR reviews */
  failOn?: SeverityThreshold;
  /** URL to the GitHub Check run containing the full report (used when findings are filtered) */
  checkRunUrl?: string;
  /** Total number of findings before filtering (used to show "X more findings" link) */
  totalFindings?: number;
  /**
   * Original findings for failOn evaluation. Use when report.findings has been
   * modified (e.g., for deduplication) but failOn should evaluate against all findings.
   */
  allFindings?: Finding[];
}
