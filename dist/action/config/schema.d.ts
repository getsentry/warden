import { z } from 'zod';
export declare const ToolNameSchema: z.ZodEnum<{
    Read: "Read";
    Write: "Write";
    Edit: "Edit";
    Bash: "Bash";
    Glob: "Glob";
    Grep: "Grep";
    WebFetch: "WebFetch";
    WebSearch: "WebSearch";
}>;
export type ToolName = z.infer<typeof ToolNameSchema>;
export declare const ToolConfigSchema: z.ZodObject<{
    allowed: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        Read: "Read";
        Write: "Write";
        Edit: "Edit";
        Bash: "Bash";
        Glob: "Glob";
        Grep: "Grep";
        WebFetch: "WebFetch";
        WebSearch: "WebSearch";
    }>>>;
    denied: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        Read: "Read";
        Write: "Write";
        Edit: "Edit";
        Bash: "Bash";
        Glob: "Glob";
        Grep: "Grep";
        WebFetch: "WebFetch";
        WebSearch: "WebSearch";
    }>>>;
}, z.core.$strip>;
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export declare const SkillDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    prompt: z.ZodString;
    tools: z.ZodOptional<z.ZodObject<{
        allowed: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            Read: "Read";
            Write: "Write";
            Edit: "Edit";
            Bash: "Bash";
            Glob: "Glob";
            Grep: "Grep";
            WebFetch: "WebFetch";
            WebSearch: "WebSearch";
        }>>>;
        denied: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            Read: "Read";
            Write: "Write";
            Edit: "Edit";
            Bash: "Bash";
            Glob: "Glob";
            Grep: "Grep";
            WebFetch: "WebFetch";
            WebSearch: "WebSearch";
        }>>>;
    }, z.core.$strip>>;
    outputSchema: z.ZodOptional<z.ZodString>;
    rootDir: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export declare const PathFilterSchema: z.ZodObject<{
    paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type PathFilter = z.infer<typeof PathFilterSchema>;
export declare const OutputConfigSchema: z.ZodObject<{
    failOn: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
        info: "info";
        off: "off";
    }>>;
    commentOn: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
        info: "info";
        off: "off";
    }>>;
    maxFindings: z.ZodOptional<z.ZodNumber>;
    commentOnSuccess: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export declare const ScheduleConfigSchema: z.ZodObject<{
    issueTitle: z.ZodOptional<z.ZodString>;
    createFixPR: z.ZodDefault<z.ZodBoolean>;
    fixBranchPrefix: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export declare const TriggerSchema: z.ZodObject<{
    name: z.ZodString;
    event: z.ZodEnum<{
        pull_request: "pull_request";
        issues: "issues";
        issue_comment: "issue_comment";
        schedule: "schedule";
    }>;
    actions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    skill: z.ZodString;
    remote: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodObject<{
        paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    output: z.ZodOptional<z.ZodObject<{
        failOn: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
            info: "info";
            off: "off";
        }>>;
        commentOn: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
            info: "info";
            off: "off";
        }>>;
        maxFindings: z.ZodOptional<z.ZodNumber>;
        commentOnSuccess: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    model: z.ZodOptional<z.ZodString>;
    maxTurns: z.ZodOptional<z.ZodNumber>;
    schedule: z.ZodOptional<z.ZodObject<{
        issueTitle: z.ZodOptional<z.ZodString>;
        createFixPR: z.ZodDefault<z.ZodBoolean>;
        fixBranchPrefix: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Trigger = z.infer<typeof TriggerSchema>;
export declare const RunnerConfigSchema: z.ZodObject<{
    concurrency: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type RunnerConfig = z.infer<typeof RunnerConfigSchema>;
export declare const FilePatternSchema: z.ZodObject<{
    pattern: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<{
        "per-hunk": "per-hunk";
        "whole-file": "whole-file";
        skip: "skip";
    }>>;
}, z.core.$strip>;
export type FilePattern = z.infer<typeof FilePatternSchema>;
export declare const CoalesceConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    maxGapLines: z.ZodDefault<z.ZodNumber>;
    maxChunkSize: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type CoalesceConfig = z.infer<typeof CoalesceConfigSchema>;
export declare const ChunkingConfigSchema: z.ZodObject<{
    filePatterns: z.ZodOptional<z.ZodArray<z.ZodObject<{
        pattern: z.ZodString;
        mode: z.ZodDefault<z.ZodEnum<{
            "per-hunk": "per-hunk";
            "whole-file": "whole-file";
            skip: "skip";
        }>>;
    }, z.core.$strip>>>;
    coalesce: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        maxGapLines: z.ZodDefault<z.ZodNumber>;
        maxChunkSize: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
export declare const DefaultsSchema: z.ZodObject<{
    filters: z.ZodOptional<z.ZodObject<{
        paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    output: z.ZodOptional<z.ZodObject<{
        failOn: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
            info: "info";
            off: "off";
        }>>;
        commentOn: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
            info: "info";
            off: "off";
        }>>;
        maxFindings: z.ZodOptional<z.ZodNumber>;
        commentOnSuccess: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    model: z.ZodOptional<z.ZodString>;
    maxTurns: z.ZodOptional<z.ZodNumber>;
    defaultBranch: z.ZodOptional<z.ZodString>;
    chunking: z.ZodOptional<z.ZodObject<{
        filePatterns: z.ZodOptional<z.ZodArray<z.ZodObject<{
            pattern: z.ZodString;
            mode: z.ZodDefault<z.ZodEnum<{
                "per-hunk": "per-hunk";
                "whole-file": "whole-file";
                skip: "skip";
            }>>;
        }, z.core.$strip>>>;
        coalesce: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            maxGapLines: z.ZodDefault<z.ZodNumber>;
            maxChunkSize: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    batchDelayMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type Defaults = z.infer<typeof DefaultsSchema>;
export declare const WardenConfigSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    defaults: z.ZodOptional<z.ZodObject<{
        filters: z.ZodOptional<z.ZodObject<{
            paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
            ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        output: z.ZodOptional<z.ZodObject<{
            failOn: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                high: "high";
                medium: "medium";
                low: "low";
                info: "info";
                off: "off";
            }>>;
            commentOn: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                high: "high";
                medium: "medium";
                low: "low";
                info: "info";
                off: "off";
            }>>;
            maxFindings: z.ZodOptional<z.ZodNumber>;
            commentOnSuccess: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        model: z.ZodOptional<z.ZodString>;
        maxTurns: z.ZodOptional<z.ZodNumber>;
        defaultBranch: z.ZodOptional<z.ZodString>;
        chunking: z.ZodOptional<z.ZodObject<{
            filePatterns: z.ZodOptional<z.ZodArray<z.ZodObject<{
                pattern: z.ZodString;
                mode: z.ZodDefault<z.ZodEnum<{
                    "per-hunk": "per-hunk";
                    "whole-file": "whole-file";
                    skip: "skip";
                }>>;
            }, z.core.$strip>>>;
            coalesce: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                maxGapLines: z.ZodDefault<z.ZodNumber>;
                maxChunkSize: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        batchDelayMs: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    triggers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        event: z.ZodEnum<{
            pull_request: "pull_request";
            issues: "issues";
            issue_comment: "issue_comment";
            schedule: "schedule";
        }>;
        actions: z.ZodOptional<z.ZodArray<z.ZodString>>;
        skill: z.ZodString;
        remote: z.ZodOptional<z.ZodString>;
        filters: z.ZodOptional<z.ZodObject<{
            paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
            ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        output: z.ZodOptional<z.ZodObject<{
            failOn: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                high: "high";
                medium: "medium";
                low: "low";
                info: "info";
                off: "off";
            }>>;
            commentOn: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                high: "high";
                medium: "medium";
                low: "low";
                info: "info";
                off: "off";
            }>>;
            maxFindings: z.ZodOptional<z.ZodNumber>;
            commentOnSuccess: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        model: z.ZodOptional<z.ZodString>;
        maxTurns: z.ZodOptional<z.ZodNumber>;
        schedule: z.ZodOptional<z.ZodObject<{
            issueTitle: z.ZodOptional<z.ZodString>;
            createFixPR: z.ZodDefault<z.ZodBoolean>;
            fixBranchPrefix: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    runner: z.ZodOptional<z.ZodObject<{
        concurrency: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WardenConfig = z.infer<typeof WardenConfigSchema>;
//# sourceMappingURL=schema.d.ts.map