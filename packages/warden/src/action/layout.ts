import { accessSync, existsSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export interface ValidateActionLayoutOptions {
  repoRoot: string;
  requireDist?: boolean;
}

/**
 * Validates files that GitHub must stage before the composite action can run.
 */
export function validateActionLayout(options: ValidateActionLayoutOptions): string[] {
  const errors: string[] = [];

  expectFile(join(options.repoRoot, 'action.yml'), errors);
  validateTrackedSymlinks(options.repoRoot, errors);

  const pluginSkillPath = join(options.repoRoot, 'plugins/warden/skills/warden');
  const expectedSkillPath = join(options.repoRoot, 'packages/warden/skills/warden');

  try {
    const stat = lstatSync(pluginSkillPath);
    if (!stat.isSymbolicLink()) {
      errors.push('plugins/warden/skills/warden must be a symlink');
    } else {
      const target = readlinkSync(pluginSkillPath);
      const resolvedTarget = realpathSync(pluginSkillPath);
      const expectedTarget = realpathSync(expectedSkillPath);

      if (resolvedTarget !== expectedTarget) {
        errors.push(
          `plugins/warden/skills/warden points to ${target}, expected packages/warden/skills/warden`,
        );
      }
    }

    expectFile(join(pluginSkillPath, 'SKILL.md'), errors);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    errors.push(`plugins/warden/skills/warden is not usable: ${reason}`);
  }

  if (options.requireDist) {
    expectFile(join(options.repoRoot, 'dist/action/index.js'), errors);
    expectFile(join(options.repoRoot, 'dist/action/package.json'), errors);
  }

  return errors;
}

function validateTrackedSymlinks(repoRoot: string, errors: string[]): void {
  let output: string;
  try {
    output = execFileSync('git', ['ls-files', '-s'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    errors.push(`Unable to inspect tracked symlinks: ${reason}`);
    return;
  }

  for (const line of output.split('\n')) {
    if (!line.startsWith('120000 ')) {
      continue;
    }

    const path = line.split('\t')[1];
    if (!path) {
      continue;
    }

    const absolutePath = join(repoRoot, path);
    let target: string;
    try {
      const stat = lstatSync(absolutePath);
      if (!stat.isSymbolicLink()) {
        errors.push(`${path} is tracked as a symlink but is not a symlink`);
        continue;
      }

      target = readlinkSync(absolutePath);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`Tracked symlink is missing: ${path} (${reason})`);
      continue;
    }

    if (!existsSync(absolutePath)) {
      errors.push(`${path} points to missing target ${target}`);
    }
  }
}

function expectFile(path: string, errors: string[]): void {
  try {
    accessSync(path);
  } catch {
    errors.push(`Missing required action file: ${path}`);
  }
}
