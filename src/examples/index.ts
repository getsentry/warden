import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { SeveritySchema } from '../types/index.js';

/**
 * Schema for expected findings in _meta.json
 */
export const ExpectedFindingSchema = z.object({
  severity: SeveritySchema,
  pattern: z.string(),
  file: z.string().optional(),
});
export type ExpectedFinding = z.infer<typeof ExpectedFindingSchema>;

/**
 * Schema for _meta.json files
 */
export const ExampleMetaSchema = z.object({
  skill: z.string(),
  description: z.string(),
  expected: z.array(ExpectedFindingSchema),
});
export type ExampleMeta = z.infer<typeof ExampleMetaSchema>;

/**
 * Get the default examples directory path.
 */
function getExamplesDir(): string {
  // This file is at src/examples/index.ts, so we need to go up to repo root
  return join(import.meta.dirname, '..', '..', 'examples');
}

/**
 * Discover all examples with _meta.json files.
 * Returns an array of absolute paths to example directories.
 */
export function discoverExamples(baseDir?: string): string[] {
  const examplesDir = baseDir ?? getExamplesDir();
  const examples: string[] = [];

  if (!existsSync(examplesDir)) {
    return examples;
  }

  // Recursively find directories containing _meta.json
  function scanDir(dir: string): void {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const entryPath = join(dir, entry);
      const stat = statSync(entryPath);

      if (stat.isDirectory()) {
        const metaPath = join(entryPath, '_meta.json');
        if (existsSync(metaPath)) {
          examples.push(entryPath);
        }
        // Continue scanning subdirectories
        scanDir(entryPath);
      }
    }
  }

  scanDir(examplesDir);
  return examples;
}

/**
 * Load and validate a _meta.json file from an example directory.
 */
export function loadExample(dir: string): ExampleMeta {
  const metaPath = join(dir, '_meta.json');

  if (!existsSync(metaPath)) {
    throw new Error(`No _meta.json found in ${dir}`);
  }

  let content: string;
  try {
    content = readFileSync(metaPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${metaPath}: ${error}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse ${metaPath}: ${error}`);
  }

  const validated = ExampleMetaSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid _meta.json in ${dir}: ${issues}`);
  }

  return validated.data;
}

/**
 * Get all source files in an example directory (excludes _meta.json).
 * Returns relative paths suitable for use with buildFileEventContext.
 */
export function getExampleFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === '_meta.json') continue;

    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}
