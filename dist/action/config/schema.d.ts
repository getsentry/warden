import { z } from 'zod';
import { RuntimeNameSchema, type RuntimeName } from '../sdk/runtimes/types.js';
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
    rootDir: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export declare const ScheduleConfigSchema: z.ZodObject<{
    issueTitle: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export declare const TriggerTypeSchema: z.ZodEnum<{
    pull_request: "pull_request";
    schedule: "schedule";
    local: "local";
}>;
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export { RuntimeNameSchema };
export type { RuntimeName };
export declare const EffortSchema: z.ZodEnum<{
    off: "off";
    low: "low";
    medium: "medium";
    high: "high";
    xhigh: "xhigh";
}>;
export type Effort = z.infer<typeof EffortSchema>;
export declare const AgentRuntimeConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    maxTurns: z.ZodOptional<z.ZodNumber>;
    effort: z.ZodOptional<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
        xhigh: "xhigh";
    }>>;
}, z.core.$strict>;
export type AgentRuntimeConfig = z.infer<typeof AgentRuntimeConfigSchema>;
export declare const AuxiliaryRuntimeConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export type AuxiliaryRuntimeConfig = z.infer<typeof AuxiliaryRuntimeConfigSchema>;
export declare const SynthesisRuntimeConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type SynthesisRuntimeConfig = z.infer<typeof SynthesisRuntimeConfigSchema>;
export declare const VerificationConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type VerificationConfig = z.infer<typeof VerificationConfigSchema>;
export declare const SkillTriggerSchema: z.ZodObject<{
    type: z.ZodEnum<{
        pull_request: "pull_request";
        schedule: "schedule";
        local: "local";
    }>;
    actions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    draft: z.ZodOptional<z.ZodBoolean>;
    labels: z.ZodOptional<z.ZodArray<z.ZodString>>;
    failOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    reportOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    maxFindings: z.ZodOptional<z.ZodNumber>;
    reportOnSuccess: z.ZodOptional<z.ZodBoolean>;
    requestChanges: z.ZodOptional<z.ZodBoolean>;
    failCheck: z.ZodOptional<z.ZodBoolean>;
    model: z.ZodOptional<z.ZodString>;
    maxTurns: z.ZodOptional<z.ZodNumber>;
    verification: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    minConfidence: z.ZodOptional<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>;
    schedule: z.ZodOptional<z.ZodObject<{
        issueTitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SkillTrigger = z.infer<typeof SkillTriggerSchema>;
export declare const SkillConfigSchema: z.ZodObject<{
    name: z.ZodString;
    paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remote: z.ZodOptional<z.ZodString>;
    failOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    reportOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    maxFindings: z.ZodOptional<z.ZodNumber>;
    reportOnSuccess: z.ZodOptional<z.ZodBoolean>;
    requestChanges: z.ZodOptional<z.ZodBoolean>;
    failCheck: z.ZodOptional<z.ZodBoolean>;
    model: z.ZodOptional<z.ZodString>;
    maxTurns: z.ZodOptional<z.ZodNumber>;
    verification: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    minConfidence: z.ZodOptional<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>;
    triggers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            pull_request: "pull_request";
            schedule: "schedule";
            local: "local";
        }>;
        actions: z.ZodOptional<z.ZodArray<z.ZodString>>;
        draft: z.ZodOptional<z.ZodBoolean>;
        labels: z.ZodOptional<z.ZodArray<z.ZodString>>;
        failOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>>;
        reportOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>>;
        maxFindings: z.ZodOptional<z.ZodNumber>;
        reportOnSuccess: z.ZodOptional<z.ZodBoolean>;
        requestChanges: z.ZodOptional<z.ZodBoolean>;
        failCheck: z.ZodOptional<z.ZodBoolean>;
        model: z.ZodOptional<z.ZodString>;
        maxTurns: z.ZodOptional<z.ZodNumber>;
        verification: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        minConfidence: z.ZodOptional<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>;
        schedule: z.ZodOptional<z.ZodObject<{
            issueTitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type SkillConfig = z.infer<typeof SkillConfigSchema>;
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
    maxContextFiles: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
export declare const IgnoreConfigSchema: z.ZodObject<{
    paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export type IgnoreConfig = z.infer<typeof IgnoreConfigSchema>;
export declare const ScanConfigSchema: z.ZodObject<{
    maxFiles: z.ZodOptional<z.ZodNumber>;
    maxChangedLines: z.ZodOptional<z.ZodNumber>;
    maxFileBytes: z.ZodOptional<z.ZodNumber>;
    maxFileLines: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export type ScanConfig = z.infer<typeof ScanConfigSchema>;
export declare const DEFAULT_SCAN_LIMITS: Required<ScanConfig>;
export declare const DefaultsSchema: z.ZodObject<{
    failOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    reportOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    maxFindings: z.ZodOptional<z.ZodNumber>;
    reportOnSuccess: z.ZodOptional<z.ZodBoolean>;
    requestChanges: z.ZodOptional<z.ZodBoolean>;
    failCheck: z.ZodOptional<z.ZodBoolean>;
    postChecks: z.ZodOptional<z.ZodBoolean>;
    model: z.ZodOptional<z.ZodString>;
    maxTurns: z.ZodOptional<z.ZodNumber>;
    runtime: z.ZodOptional<z.ZodEnum<{
        claude: "claude";
        pi: "pi";
    }>>;
    agent: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        maxTurns: z.ZodOptional<z.ZodNumber>;
        effort: z.ZodOptional<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
            xhigh: "xhigh";
        }>>;
    }, z.core.$strict>>;
    auxiliary: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        maxRetries: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    synthesis: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    verification: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    minConfidence: z.ZodOptional<z.ZodEnum<{
        off: "off";
        low: "low";
        medium: "medium";
        high: "high";
    }>>;
    ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
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
        maxContextFiles: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    ignore: z.ZodOptional<z.ZodObject<{
        paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>;
    scan: z.ZodOptional<z.ZodObject<{
        maxFiles: z.ZodOptional<z.ZodNumber>;
        maxChangedLines: z.ZodOptional<z.ZodNumber>;
        maxFileBytes: z.ZodOptional<z.ZodNumber>;
        maxFileLines: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    batchDelayMs: z.ZodOptional<z.ZodNumber>;
    auxiliaryMaxRetries: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type Defaults = z.infer<typeof DefaultsSchema>;
export declare const LogCleanupModeSchema: z.ZodEnum<{
    never: "never";
    ask: "ask";
    auto: "auto";
}>;
export type LogCleanupMode = z.infer<typeof LogCleanupModeSchema>;
export declare const LogsConfigSchema: z.ZodObject<{
    cleanup: z.ZodDefault<z.ZodEnum<{
        never: "never";
        ask: "ask";
        auto: "auto";
    }>>;
    retentionDays: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type LogsConfig = z.infer<typeof LogsConfigSchema>;
export declare const WardenConfigSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    defaults: z.ZodOptional<z.ZodObject<{
        failOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>>;
        reportOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>>;
        maxFindings: z.ZodOptional<z.ZodNumber>;
        reportOnSuccess: z.ZodOptional<z.ZodBoolean>;
        requestChanges: z.ZodOptional<z.ZodBoolean>;
        failCheck: z.ZodOptional<z.ZodBoolean>;
        postChecks: z.ZodOptional<z.ZodBoolean>;
        model: z.ZodOptional<z.ZodString>;
        maxTurns: z.ZodOptional<z.ZodNumber>;
        runtime: z.ZodOptional<z.ZodEnum<{
            claude: "claude";
            pi: "pi";
        }>>;
        agent: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            maxTurns: z.ZodOptional<z.ZodNumber>;
            effort: z.ZodOptional<z.ZodEnum<{
                off: "off";
                low: "low";
                medium: "medium";
                high: "high";
                xhigh: "xhigh";
            }>>;
        }, z.core.$strict>>;
        auxiliary: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            maxRetries: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        synthesis: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        verification: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        minConfidence: z.ZodOptional<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>;
        ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
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
            maxContextFiles: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
        ignore: z.ZodOptional<z.ZodObject<{
            paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>>;
        scan: z.ZodOptional<z.ZodObject<{
            maxFiles: z.ZodOptional<z.ZodNumber>;
            maxChangedLines: z.ZodOptional<z.ZodNumber>;
            maxFileBytes: z.ZodOptional<z.ZodNumber>;
            maxFileLines: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        batchDelayMs: z.ZodOptional<z.ZodNumber>;
        auxiliaryMaxRetries: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    skills: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        ignorePaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remote: z.ZodOptional<z.ZodString>;
        failOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>>;
        reportOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>>;
        maxFindings: z.ZodOptional<z.ZodNumber>;
        reportOnSuccess: z.ZodOptional<z.ZodBoolean>;
        requestChanges: z.ZodOptional<z.ZodBoolean>;
        failCheck: z.ZodOptional<z.ZodBoolean>;
        model: z.ZodOptional<z.ZodString>;
        maxTurns: z.ZodOptional<z.ZodNumber>;
        verification: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        minConfidence: z.ZodOptional<z.ZodEnum<{
            off: "off";
            low: "low";
            medium: "medium";
            high: "high";
        }>>;
        triggers: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<{
                pull_request: "pull_request";
                schedule: "schedule";
                local: "local";
            }>;
            actions: z.ZodOptional<z.ZodArray<z.ZodString>>;
            draft: z.ZodOptional<z.ZodBoolean>;
            labels: z.ZodOptional<z.ZodArray<z.ZodString>>;
            failOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
                off: "off";
                low: "low";
                medium: "medium";
                high: "high";
            }>>>;
            reportOn: z.ZodOptional<z.ZodPreprocess<z.ZodEnum<{
                off: "off";
                low: "low";
                medium: "medium";
                high: "high";
            }>>>;
            maxFindings: z.ZodOptional<z.ZodNumber>;
            reportOnSuccess: z.ZodOptional<z.ZodBoolean>;
            requestChanges: z.ZodOptional<z.ZodBoolean>;
            failCheck: z.ZodOptional<z.ZodBoolean>;
            model: z.ZodOptional<z.ZodString>;
            maxTurns: z.ZodOptional<z.ZodNumber>;
            verification: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            minConfidence: z.ZodOptional<z.ZodEnum<{
                off: "off";
                low: "low";
                medium: "medium";
                high: "high";
            }>>;
            schedule: z.ZodOptional<z.ZodObject<{
                issueTitle: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>>;
    runner: z.ZodOptional<z.ZodObject<{
        concurrency: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    logs: z.ZodOptional<z.ZodObject<{
        cleanup: z.ZodDefault<z.ZodEnum<{
            never: "never";
            ask: "ask";
            auto: "auto";
        }>>;
        retentionDays: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WardenConfig = z.infer<typeof WardenConfigSchema>;
//# sourceMappingURL=schema.d.ts.map