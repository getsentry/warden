/**
 * Creates or updates the automation/update-model-pricing PR with the latest
 * generated model pricing. The working tree must only contain the expected
 * change to model-pricing.json before this script is called.
 *
 * Expects GH_TOKEN env var to be set to a write-capable GitHub App token.
 *
 * Usage: pnpm --filter @sentry/warden update-pricing-pr
 */

import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PRICING_FILE = 'packages/warden/src/sdk/model-pricing.json';
const AUTOMATION_BRANCH = 'automation/update-model-pricing';
const PR_TITLE = 'chore: update model pricing';
const PR_BODY = 'Updates model pricing from pydantic/genai-prices.';

/** Run a shell command from the repo root and return trimmed stdout. */
function exec(cmd: string, repoRoot: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', cwd: repoRoot }).trim();
}

function main(): void {
  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  const run = (cmd: string) => exec(cmd, repoRoot);

  // 1. Verify working tree only contains the expected generated file change.
  const changed = run('git diff --name-only').split('\n').filter(Boolean);
  if (changed.length === 0) {
    console.log('No changes detected. Model pricing is already up to date.');
    process.exit(0);
  }
  if (changed.length !== 1 || changed[0] !== PRICING_FILE) {
    console.error(
      `Unexpected working tree changes:\n  ${changed.join('\n  ')}\nExpected only: ${PRICING_FILE}`,
    );
    process.exit(1);
  }

  // 2. Save the generated pricing file to a temp path before any git operations.
  const tmpDir = mkdtempSync(join(tmpdir(), 'pricing-update-'));
  const tmpFile = join(tmpDir, 'model-pricing.json');
  copyFileSync(join(repoRoot, PRICING_FILE), tmpFile);

  // 3. Fetch refs. The automation branch may not exist yet; fetch it separately
  //    so a missing ref does not fail the entire fetch.
  try {
    run(`git fetch origin main ${AUTOMATION_BRANCH}`);
  } catch {
    run('git fetch origin main');
  }

  // 4. Compare generated file against origin/main.
  let mainContent: string;
  try {
    mainContent = run(`git show origin/main:${PRICING_FILE}`);
  } catch {
    console.error(`Could not read ${PRICING_FILE} from origin/main`);
    process.exit(1);
  }

  const generatedContent = readFileSync(tmpFile, 'utf8');
  if (generatedContent === mainContent) {
    console.log('Generated pricing matches origin/main. Nothing to do.');
    process.exit(0);
  }

  // 5. Recreate the automation branch cleanly from origin/main and push.
  run(`git switch -C ${AUTOMATION_BRANCH} origin/main`);
  copyFileSync(tmpFile, join(repoRoot, PRICING_FILE));
  run(`git add ${PRICING_FILE}`);
  run(`git commit -m "${PR_TITLE}"`);
  run(`git push --force-with-lease origin ${AUTOMATION_BRANCH}`);
  console.log(`Pushed branch ${AUTOMATION_BRANCH}`);

  // 6. Check for an existing open PR on the automation branch.
  const existingPr = run(
    `gh pr list --head ${AUTOMATION_BRANCH} --base main --state open --json number --jq '.[0].number'`,
  );

  if (existingPr) {
    console.log(`Branch updated. Existing PR #${existingPr} refreshed automatically.`);
    return;
  }

  // 7. No open PR found — create one.
  const prUrl = run(
    `gh pr create --base main --head ${AUTOMATION_BRANCH} --title "${PR_TITLE}" --body "${PR_BODY}"`,
  );
  console.log(`Created PR: ${prUrl}`);
}

main();
