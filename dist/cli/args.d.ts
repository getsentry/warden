import { z } from 'zod';
export declare const CLIOptionsSchema: z.ZodObject<{
    targets: z.ZodOptional<z.ZodArray<z.ZodString>>;
    skill: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodString>;
    json: z.ZodDefault<z.ZodBoolean>;
    failOn: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
        info: "info";
    }>>;
    commentOn: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
        info: "info";
    }>>;
    help: z.ZodDefault<z.ZodBoolean>;
    parallel: z.ZodOptional<z.ZodNumber>;
    quiet: z.ZodDefault<z.ZodBoolean>;
    verbose: z.ZodDefault<z.ZodNumber>;
    color: z.ZodOptional<z.ZodBoolean>;
    fix: z.ZodDefault<z.ZodBoolean>;
    force: z.ZodDefault<z.ZodBoolean>;
    list: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CLIOptions = z.infer<typeof CLIOptionsSchema>;
export interface ParsedArgs {
    command: 'run' | 'help' | 'init' | 'add' | 'version';
    options: CLIOptions;
}
export declare function showVersion(): void;
export declare function showHelp(): void;
/**
 * Detect if a target looks like a git ref vs a file path.
 * Returns 'git' for git refs, 'file' for file paths.
 */
export declare function detectTargetType(target: string): 'git' | 'file';
/**
 * Classify targets into git refs and file patterns.
 */
export declare function classifyTargets(targets: string[]): {
    gitRefs: string[];
    filePatterns: string[];
};
export declare function parseCliArgs(argv?: string[]): ParsedArgs;
//# sourceMappingURL=args.d.ts.map