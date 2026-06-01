import { accessSync, existsSync, lstatSync, readlinkSync } from 'node:fs';
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

  // skills/ at the repo root is the canonical discovery location for both
  // dotagents (default scan dir) and the Claude Code marketplace plugin.
  // Validate that each skill dir exists and is readable.
  for (const skillName of ['warden', 'warden-sweep']) {
    expectFile(join(options.repoRoot, `skills/${skillName}/SKILL.md`), errors);
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
