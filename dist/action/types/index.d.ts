import { z } from 'zod';
export declare const SeveritySchema: z.ZodEnum<{
    critical: "critical";
    high: "high";
    medium: "medium";
    low: "low";
    info: "info";
}>;
export type Severity = z.infer<typeof SeveritySchema>;
export declare const ConfidenceSchema: z.ZodEnum<{
    high: "high";
    medium: "medium";
    low: "low";
}>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
/**
 * Confidence order for comparison (lower = more confident).
 * Single source of truth for confidence ordering across the codebase.
 */
export declare const CONFIDENCE_ORDER: Record<Confidence, number>;
export declare const SeverityThresholdSchema: z.ZodEnum<{
    critical: "critical";
    high: "high";
    medium: "medium";
    low: "low";
    info: "info";
    off: "off";
}>;
export type SeverityThreshold = z.infer<typeof SeverityThresholdSchema>;
/**
 * Severity order for comparison (lower = more severe).
 * Single source of truth for severity ordering across the codebase.
 */
export declare const SEVERITY_ORDER: Record<Severity, number>;
/**
 * Filter findings to only include those at or above the given severity threshold.
 * If no threshold is provided, returns all findings unchanged.
 * If threshold is 'off', returns empty array (disabled).
 */
export declare function filterFindingsBySeverity(findings: Finding[], threshold?: SeverityThreshold): Finding[];
export declare const LocationSchema: z.ZodObject<{
    path: z.ZodString;
    startLine: z.ZodNumber;
    endLine: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type Location = z.infer<typeof LocationSchema>;
export declare const SuggestedFixSchema: z.ZodObject<{
    description: z.ZodString;
    diff: z.ZodString;
}, z.core.$strip>;
export type SuggestedFix = z.infer<typeof SuggestedFixSchema>;
export declare const FindingSchema: z.ZodObject<{
    id: z.ZodString;
    severity: z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
        info: "info";
    }>;
    confidence: z.ZodOptional<z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>>;
    title: z.ZodString;
    description: z.ZodString;
    location: z.ZodOptional<z.ZodObject<{
        path: z.ZodString;
        startLine: z.ZodNumber;
        endLine: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    suggestedFix: z.ZodOptional<z.ZodObject<{
        description: z.ZodString;
        diff: z.ZodString;
    }, z.core.$strip>>;
    elapsedMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type Finding = z.infer<typeof FindingSchema>;
export declare const UsageStatsSchema: z.ZodObject<{
    inputTokens: z.ZodNumber;
    outputTokens: z.ZodNumber;
    cacheReadInputTokens: z.ZodOptional<z.ZodNumber>;
    cacheCreationInputTokens: z.ZodOptional<z.ZodNumber>;
    costUSD: z.ZodNumber;
}, z.core.$strip>;
export type UsageStats = z.infer<typeof UsageStatsSchema>;
export declare const SkippedFileSchema: z.ZodObject<{
    filename: z.ZodString;
    reason: z.ZodEnum<{
        pattern: "pattern";
        builtin: "builtin";
    }>;
    pattern: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SkippedFile = z.infer<typeof SkippedFileSchema>;
export declare const SkillReportSchema: z.ZodObject<{
    skill: z.ZodString;
    summary: z.ZodString;
    findings: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        severity: z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
            info: "info";
        }>;
        confidence: z.ZodOptional<z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>>;
        title: z.ZodString;
        description: z.ZodString;
        location: z.ZodOptional<z.ZodObject<{
            path: z.ZodString;
            startLine: z.ZodNumber;
            endLine: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        suggestedFix: z.ZodOptional<z.ZodObject<{
            description: z.ZodString;
            diff: z.ZodString;
        }, z.core.$strip>>;
        elapsedMs: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    durationMs: z.ZodOptional<z.ZodNumber>;
    usage: z.ZodOptional<z.ZodObject<{
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        cacheReadInputTokens: z.ZodOptional<z.ZodNumber>;
        cacheCreationInputTokens: z.ZodOptional<z.ZodNumber>;
        costUSD: z.ZodNumber;
    }, z.core.$strip>>;
    skippedFiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        reason: z.ZodEnum<{
            pattern: "pattern";
            builtin: "builtin";
        }>;
        pattern: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    failedHunks: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type SkillReport = z.infer<typeof SkillReportSchema>;
export declare const GitHubEventTypeSchema: z.ZodEnum<{
    pull_request: "pull_request";
    issues: "issues";
    issue_comment: "issue_comment";
    pull_request_review: "pull_request_review";
    pull_request_review_comment: "pull_request_review_comment";
    schedule: "schedule";
}>;
export type GitHubEventType = z.infer<typeof GitHubEventTypeSchema>;
export declare const PullRequestActionSchema: z.ZodEnum<{
    closed: "closed";
    reopened: "reopened";
    opened: "opened";
    synchronize: "synchronize";
}>;
export type PullRequestAction = z.infer<typeof PullRequestActionSchema>;
export declare const FileChangeSchema: z.ZodObject<{
    filename: z.ZodString;
    status: z.ZodEnum<{
        added: "added";
        removed: "removed";
        modified: "modified";
        renamed: "renamed";
        copied: "copied";
        changed: "changed";
        unchanged: "unchanged";
    }>;
    additions: z.ZodNumber;
    deletions: z.ZodNumber;
    patch: z.ZodOptional<z.ZodString>;
    chunks: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type FileChange = z.infer<typeof FileChangeSchema>;
/**
 * Count the number of chunks/hunks in a patch string.
 * Each chunk starts with @@ -X,Y +A,B @@
 */
export declare function countPatchChunks(patch: string | undefined): number;
export declare const PullRequestContextSchema: z.ZodObject<{
    number: z.ZodNumber;
    title: z.ZodString;
    body: z.ZodNullable<z.ZodString>;
    author: z.ZodString;
    baseBranch: z.ZodString;
    headBranch: z.ZodString;
    headSha: z.ZodString;
    files: z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        status: z.ZodEnum<{
            added: "added";
            removed: "removed";
            modified: "modified";
            renamed: "renamed";
            copied: "copied";
            changed: "changed";
            unchanged: "unchanged";
        }>;
        additions: z.ZodNumber;
        deletions: z.ZodNumber;
        patch: z.ZodOptional<z.ZodString>;
        chunks: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PullRequestContext = z.infer<typeof PullRequestContextSchema>;
export declare const RepositoryContextSchema: z.ZodObject<{
    owner: z.ZodString;
    name: z.ZodString;
    fullName: z.ZodString;
    defaultBranch: z.ZodString;
}, z.core.$strip>;
export type RepositoryContext = z.infer<typeof RepositoryContextSchema>;
export declare const EventContextSchema: z.ZodObject<{
    eventType: z.ZodEnum<{
        pull_request: "pull_request";
        issues: "issues";
        issue_comment: "issue_comment";
        pull_request_review: "pull_request_review";
        pull_request_review_comment: "pull_request_review_comment";
        schedule: "schedule";
    }>;
    action: z.ZodString;
    repository: z.ZodObject<{
        owner: z.ZodString;
        name: z.ZodString;
        fullName: z.ZodString;
        defaultBranch: z.ZodString;
    }, z.core.$strip>;
    pullRequest: z.ZodOptional<z.ZodObject<{
        number: z.ZodNumber;
        title: z.ZodString;
        body: z.ZodNullable<z.ZodString>;
        author: z.ZodString;
        baseBranch: z.ZodString;
        headBranch: z.ZodString;
        headSha: z.ZodString;
        files: z.ZodArray<z.ZodObject<{
            filename: z.ZodString;
            status: z.ZodEnum<{
                added: "added";
                removed: "removed";
                modified: "modified";
                renamed: "renamed";
                copied: "copied";
                changed: "changed";
                unchanged: "unchanged";
            }>;
            additions: z.ZodNumber;
            deletions: z.ZodNumber;
            patch: z.ZodOptional<z.ZodString>;
            chunks: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    repoPath: z.ZodString;
}, z.core.$strip>;
export type EventContext = z.infer<typeof EventContextSchema>;
export declare const RetryConfigSchema: z.ZodObject<{
    maxRetries: z.ZodDefault<z.ZodNumber>;
    initialDelayMs: z.ZodDefault<z.ZodNumber>;
    backoffMultiplier: z.ZodDefault<z.ZodNumber>;
    maxDelayMs: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
//# sourceMappingURL=index.d.ts.map