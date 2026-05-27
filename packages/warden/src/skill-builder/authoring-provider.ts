import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SkillBuildAuthoringProvider } from './skill-contract.js';

const DEFAULT_AUTHORING_SKILL_NAME = 'skill-writer';
const AUTHORING_PROVIDER_ENV = 'WARDEN_SKILL_AUTHORING_ROOT';

function hashDirectory(rootDir: string): string {
  const hash = createHash('sha256');

  function visit(relativeDir: string): void {
    const absoluteDir = join(rootDir, relativeDir);
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const absolutePath = join(rootDir, relativePath);
      if (entry.isDirectory()) {
        visit(relativePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      hash.update(relativePath);
      hash.update('\0');
      hash.update(readFileSync(absolutePath));
      hash.update('\0');
    }
  }

  visit('');
  return hash.digest('hex');
}

function candidateAuthoringSkillRoots(): string[] {
  const fromEnv = process.env[AUTHORING_PROVIDER_ENV];
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  return [
    fromEnv ? resolve(fromEnv) : undefined,
    join(packageRoot, 'src', 'internal-skills', DEFAULT_AUTHORING_SKILL_NAME),
  ].filter((path): path is string => Boolean(path));
}

function authoringSkillName(rootDir: string): string {
  const content = readFileSync(join(rootDir, 'SKILL.md'), 'utf-8');
  const match = /^name:\s*["']?([^"'\n]+)["']?$/m.exec(content);
  return match?.[1]?.trim() || basename(rootDir);
}

export function resolveAuthoringProvider(args: {
  authoringSkillRoot?: string;
} = {}): SkillBuildAuthoringProvider {
  const roots = args.authoringSkillRoot
    ? [resolve(args.authoringSkillRoot)]
    : candidateAuthoringSkillRoots();

  for (const rootDir of roots) {
    const skillPath = join(rootDir, 'SKILL.md');
    if (!existsSync(skillPath)) {
      continue;
    }
    const stat = statSync(skillPath);
    if (!stat.isFile()) {
      continue;
    }
    return {
      name: authoringSkillName(rootDir),
      rootDir,
      contentHash: hashDirectory(rootDir),
    };
  }

  const searched = roots.map((root) => `- ${root}`).join('\n');
  throw new Error(
    `Unable to find generated-skill authoring provider "${DEFAULT_AUTHORING_SKILL_NAME}". ` +
    `Set ${AUTHORING_PROVIDER_ENV} or ensure the internal provider is packaged in one of:\n${searched}`,
  );
}
