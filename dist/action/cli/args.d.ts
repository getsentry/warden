import { z } from 'zod';
export declare const CLIOptionsSchema: z.ZodObject<{
    targets: z.ZodOptional<z.ZodArray<z.ZodString>>;
    skill: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodString>;
    json: z.ZodDefault<z.ZodBoolean>;
    output: z.ZodOptional<z.ZodString>;
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
    help: z.ZodDefault<z.ZodBoolean>;
    parallel: z.ZodOptional<z.ZodNumber>;
    model: z.ZodOptional<z.ZodString>;
    quiet: z.ZodDefault<z.ZodBoolean>;
    verbose: z.ZodDefault<z.ZodNumber>;
    color: z.ZodOptional<z.ZodBoolean>;
    fix: z.ZodDefault<z.ZodBoolean>;
    force: z.ZodDefault<z.ZodBoolean>;
    list: z.ZodDefault<z.ZodBoolean>;
    git: z.ZodDefault<z.ZodBoolean>;
    remote: z.ZodOptional<z.ZodString>;
    offline: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CLIOptions = z.infer<typeof CLIOptionsSchema>;
export interface SetupAppOptions {
    org?: string;
    port: number;
    timeout: number;
    name?: string;
    open: boolean;
}
export interface ParsedArgs {
    command: 'run' | 'help' | 'init' | 'add' | 'version' | 'setup-app' | 'sync';
    options: CLIOptions;
    setupAppOptions?: SetupAppOptions;
}
export declare function showVersion(): void;
export declare function showHelp(): void;
export interface DetectTargetTypeOptions {
    /** Current working directory for filesystem checks */
    cwd?: string;
    /** Force git ref interpretation for ambiguous targets */
    forceGit?: boolean;
}
/**
 * Detect if a target looks like a git ref vs a file path.
 * Returns 'git' for git refs, 'file' for file paths.
 *
 * For ambiguous targets (no path separators, no extension), checks
 * if a file/directory exists at that path before defaulting to git ref.
 */
export declare function detectTargetType(target: string, options?: DetectTargetTypeOptions): 'git' | 'file';
/**
 * Classify targets into git refs and file patterns.
 */
export declare function classifyTargets(targets: string[], options?: DetectTargetTypeOptions): {
    gitRefs: string[];
    filePatterns: string[];
};
export declare function parseCliArgs(argv?: string[]): ParsedArgs;
//# sourceMappingURL=args.d.ts.map