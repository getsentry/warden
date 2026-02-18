import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { SuppressionFileSchema } from './types.js';
import type { SuppressionRule } from './types.js';

const SUPPRESSIONS_PATH = '.agents/warden/suppressions.yaml';

/**
 * Load suppression rules from .agents/warden/suppressions.yaml.
 * Returns an empty array if the file does not exist.
 * Throws on malformed YAML or invalid schema.
 */
export function loadSuppressions(repoPath: string): SuppressionRule[] {
  const filePath = join(repoPath, SUPPRESSIONS_PATH);

  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const raw = parseYaml(content);
  const result = SuppressionFileSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid suppressions file ${SUPPRESSIONS_PATH}:\n${issues}`);
  }

  return result.data.suppressions;
}
