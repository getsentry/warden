export interface GitHubComment {
  body: string;
  path?: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
}

export interface GitHubReview {
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body: string;
  comments: GitHubComment[];
}

export interface GitHubLabel {
  name: string;
  action: 'add' | 'remove';
}

export interface RenderResult {
  review?: GitHubReview;
  summaryComment: string;
  labels: GitHubLabel[];
}

export interface RenderOptions {
  includeSuggestions?: boolean;
  maxFindings?: number;
  groupByFile?: boolean;
  extraLabels?: string[];
}
