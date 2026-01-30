import type { SeverityThreshold } from '../types/index.js';

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
  /** URL to the GitHub Check run containing the full report (used when findings are filtered) */
  checkRunUrl?: string;
  /** Total number of findings before filtering (used to show "X more findings" link) */
  totalFindings?: number;
}
