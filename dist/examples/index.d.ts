import { z } from 'zod';
/**
 * Schema for expected findings in _meta.json
 */
export declare const ExpectedFindingSchema: z.ZodObject<{
    severity: z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
        info: "info";
    }>;
    pattern: z.ZodString;
    file: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ExpectedFinding = z.infer<typeof ExpectedFindingSchema>;
/**
 * Schema for _meta.json files
 */
export declare const ExampleMetaSchema: z.ZodObject<{
    skill: z.ZodString;
    description: z.ZodString;
    expected: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
            info: "info";
        }>;
        pattern: z.ZodString;
        file: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ExampleMeta = z.infer<typeof ExampleMetaSchema>;
/**
 * Discover all examples with _meta.json files.
 * Returns an array of absolute paths to example directories.
 */
export declare function discoverExamples(baseDir?: string): string[];
/**
 * Load and validate a _meta.json file from an example directory.
 */
export declare function loadExample(dir: string): ExampleMeta;
/**
 * Get all source files in an example directory (excludes _meta.json).
 * Returns relative paths suitable for use with buildFileEventContext.
 */
export declare function getExampleFiles(dir: string): string[];
//# sourceMappingURL=index.d.ts.map