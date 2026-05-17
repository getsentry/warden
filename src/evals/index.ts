import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  DEFAULT_EVAL_MODEL,
  DEFAULT_EVAL_RUNTIME,
  EvalFileSchema,
  EvalScenarioFileSchema,
} from './types.js';
import type { EvalFile, EvalMeta, EvalScenarioFile } from './types.js';
import type { RuntimeName } from '../sdk/runtimes/types.js';

export type { EvalMeta };

export interface EvalScenarioSetOptions {
  /** Category/suite name, and directory under evals/ containing JSON scenarios. */
  category: string;
  /** Skill to run, relative to evals/ directory. */
  skill: string;
  /** Default runtime for all scenarios in this set. */
  runtime?: RuntimeName;
  /** Default model for all scenarios in this set. */
  model?: string;
  /** Optional evals directory override for tests. */
  baseDir?: string;
}

/**
 * Get the default evals directory path.
 */
function getEvalsDir(): string {
  return join(import.meta.dirname, '..', '..', 'evals');
}

function fallbackSkillName(skillPath: string): string {
  const filename = basename(skillPath);
  return filename === 'SKILL.md'
    ? basename(dirname(skillPath))
    : filename.replace(/\.[^.]+$/, '');
}

/**
 * Resolve the skill name used in eval output from skill frontmatter.
 */
export function resolveEvalSkillName(skillPath: string): string {
  let content: string;
  try {
    content = readFileSync(skillPath, 'utf-8');
  } catch {
    return fallbackSkillName(skillPath);
  }

  if (!content.startsWith('---')) {
    return fallbackSkillName(skillPath);
  }

  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return fallbackSkillName(skillPath);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(content.slice(3, end));
  } catch {
    return fallbackSkillName(skillPath);
  }
  if (parsed && typeof parsed === 'object' && 'name' in parsed) {
    const name = (parsed as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) {
      return name.trim();
    }
  }

  return fallbackSkillName(skillPath);
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
 * Discover standalone JSON scenario files in evals/<category>/.
 */
export function discoverEvalScenarioFiles(category: string, baseDir?: string): string[] {
  const scenarioDir = join(baseDir ?? getEvalsDir(), category);

  if (!existsSync(scenarioDir)) {
    return [];
  }

  let entries: string[];
  try {
    entries = readdirSync(scenarioDir);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => join(scenarioDir, entry))
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
    throw new Error(`Failed to read ${filePath}: ${error}`, { cause: error });
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
 * Load and validate a standalone JSON eval scenario.
 */
export function loadEvalScenarioFile(filePath: string): EvalScenarioFile {
  if (!existsSync(filePath)) {
    throw new Error(`Eval scenario file not found: ${filePath}`);
  }

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error}`, { cause: error });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON in ${filePath}: ${error}`);
  }

  const validated = EvalScenarioFileSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid eval scenario file ${filePath}: ${issues}`);
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
  const skillPath = join(evalsDir, evalFile.skill);

  if (!existsSync(skillPath)) {
    throw new Error(`Eval skill not found in ${yamlPath}: ${evalFile.skill}`);
  }

  const skillName = resolveEvalSkillName(skillPath);

  return evalFile.evals.map((scenario) => {
    const filePaths = scenario.files.map((file) => {
      const filePath = join(evalsDir, file);
      if (!existsSync(filePath)) {
        throw new Error(`Eval fixture not found for ${category}/${scenario.name}: ${file}`);
      }
      return filePath;
    });

    return {
      name: scenario.name,
      category,
      skillName,
      given: scenario.given,
      skillPath,
      filePaths,
      model: scenario.model ?? evalFile.model,
      runtime: scenario.runtime ?? evalFile.runtime,
      should_find: scenario.should_find,
      should_not_find: scenario.should_not_find,
    };
  });
}

/**
 * Resolve one standalone JSON scenario into executable EvalMeta.
 */
export function resolveEvalScenarioMeta(
  scenario: EvalScenarioFile,
  scenarioPath: string,
  options: EvalScenarioSetOptions
): EvalMeta {
  const evalsDir = options.baseDir ?? getEvalsDir();
  const name = scenario.name ?? basename(scenarioPath).replace(/\.json$/, '');
  const skillPath = join(evalsDir, options.skill);

  if (!existsSync(skillPath)) {
    throw new Error(`Eval skill not found for ${options.category}/${name}: ${options.skill}`);
  }

  const filePaths = scenario.files.map((file) => {
    const filePath = join(evalsDir, file);
    if (!existsSync(filePath)) {
      throw new Error(`Eval fixture not found for ${options.category}/${name}: ${file}`);
    }
    return filePath;
  });

  return {
    name,
    category: options.category,
    skillName: resolveEvalSkillName(skillPath),
    given: scenario.given,
    skillPath,
    filePaths,
    model: scenario.model ?? options.model ?? DEFAULT_EVAL_MODEL,
    runtime: scenario.runtime ?? options.runtime ?? DEFAULT_EVAL_RUNTIME,
    should_find: scenario.should_find,
    should_not_find: scenario.should_not_find,
  };
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

/**
 * Discover and load standalone JSON scenarios for a category.
 */
export function discoverEvalScenarios(options: EvalScenarioSetOptions): EvalMeta[] {
  return discoverEvalScenarioFiles(options.category, options.baseDir)
    .map((scenarioPath) => {
      const scenario = loadEvalScenarioFile(scenarioPath);
      return resolveEvalScenarioMeta(scenario, scenarioPath, options);
    });
}
