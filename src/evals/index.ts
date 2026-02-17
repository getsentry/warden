import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { EvalFileSchema } from './types.js';
import type { EvalFile, EvalMeta } from './types.js';

export type { EvalMeta };

/**
 * Get the default evals directory path.
 */
function getEvalsDir(): string {
  return join(import.meta.dirname, '..', '..', 'evals');
}

/**
 * Discover all YAML eval files in the evals directory.
 * Returns absolute paths to .yaml files, sorted alphabetically.
 */
export function discoverEvalFiles(baseDir?: string): string[] {
  const evalsDir = baseDir ?? getEvalsDir();

  if (!existsSync(evalsDir)) {
    return [];
  }

  let entries: string[];
  try {
    entries = readdirSync(evalsDir);
  } catch {
    return [];
  }

  return entries
    .filter((e) => e.endsWith('.yaml') || e.endsWith('.yml'))
    .map((e) => join(evalsDir, e))
    .sort();
}

/**
 * Load and validate a YAML eval file.
 */
export function loadEvalFile(filePath: string): EvalFile {
  if (!existsSync(filePath)) {
    throw new Error(`Eval file not found: ${filePath}`);
  }

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error}`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new Error(`Failed to parse YAML in ${filePath}: ${error}`);
  }

  const validated = EvalFileSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid eval file ${filePath}: ${issues}`);
  }

  return validated.data;
}

/**
 * Resolve all eval scenarios from a YAML file into executable EvalMeta objects.
 * Resolves relative paths for skills and fixtures against the evals directory.
 */
export function resolveEvalMetas(evalFile: EvalFile, yamlPath: string): EvalMeta[] {
  const evalsDir = join(yamlPath, '..');
  const category = basename(yamlPath).replace(/\.ya?ml$/, '');

  return evalFile.evals.map((scenario) => ({
    name: scenario.name,
    category,
    given: scenario.given,
    skillPath: join(evalsDir, evalFile.skill),
    filePaths: scenario.files.map((f) => join(evalsDir, f)),
    model: scenario.model ?? evalFile.model,
    should_find: scenario.should_find,
    should_not_find: scenario.should_not_find,
  }));
}

/**
 * Discover and load all evals from YAML files. Returns a flat list of
 * resolved EvalMeta objects ready for execution.
 */
export function discoverEvals(baseDir?: string): EvalMeta[] {
  const yamlFiles = discoverEvalFiles(baseDir);
  const allEvals: EvalMeta[] = [];

  for (const yamlPath of yamlFiles) {
    const evalFile = loadEvalFile(yamlPath);
    const metas = resolveEvalMetas(evalFile, yamlPath);
    allEvals.push(...metas);
  }

  return allEvals;
}
