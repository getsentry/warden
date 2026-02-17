import { dirname } from 'node:path';
import { buildFileEventContext } from '../cli/context.js';
import { resolveSkillAsync } from '../skills/loader.js';
import { runSkill } from '../sdk/runner.js';
import { runJudge } from './judge.js';
import { evalPassed } from './types.js';
import type { EvalMeta, EvalResult } from './types.js';

export interface RunEvalOptions {
  /** Anthropic API key */
  apiKey: string;
  /** Override the model from the YAML spec */
  model?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Run a single eval scenario end-to-end.
 *
 * Evals test Warden's behavior, not individual skills. The skill in the YAML
 * spec is a test vehicle. The eval verifies that Warden's full pipeline
 * (context building, prompt construction, agent invocation, finding extraction)
 * produces the expected behavioral outcomes.
 *
 * 1. Uses pre-resolved fixture file paths from EvalMeta
 * 2. Builds a synthetic EventContext treating files as added
 * 3. Resolves and runs the skill via the full SDK pipeline
 * 4. Runs the LLM judge to evaluate findings
 * 5. Returns a structured result
 */
export async function runEval(
  meta: EvalMeta,
  options: RunEvalOptions
): Promise<EvalResult> {
  const startTime = Date.now();
  const name = `${meta.category}/${meta.name}`;
  const logs: string[] = [];

  const log = (msg: string): void => {
    logs.push(`[${Date.now() - startTime}ms] ${msg}`);
    if (options.verbose) {
      console.log(`  [eval:${name}] ${msg}`);
    }
  };

  // 1. Validate fixture files exist
  if (meta.filePaths.length === 0) {
    throw new Error(`No fixture files specified for eval: ${name}`);
  }
  log(`Fixture file(s): ${meta.filePaths.map((f) => f.split('/').pop()).join(', ')}`);

  // 2. Build synthetic event context from fixture files
  log('Building event context...');
  const firstFile = meta.filePaths[0];
  if (!firstFile) {
    throw new Error(`No fixture files specified for eval: ${name}`);
  }
  const cwd = dirname(firstFile);
  const context = await buildFileEventContext({
    patterns: meta.filePaths,
    cwd,
  });
  log(`Context built: ${context.pullRequest?.files.length ?? 0} file(s)`);

  // 3. Resolve the skill from the absolute path
  log(`Resolving skill: ${meta.skillPath}`);
  const skill = await resolveSkillAsync(meta.skillPath);
  log(`Skill resolved: ${skill.name}`);

  // 4. Run the skill via the full SDK pipeline
  const model = options.model ?? meta.model;
  log(`Running skill with model: ${model}`);

  const report = await runSkill(skill, context, {
    apiKey: options.apiKey,
    model,
    verbose: options.verbose,
    parallel: false,
  });

  log(`Skill complete: ${report.findings.length} finding(s)`);
  for (const finding of report.findings) {
    const loc = finding.location ? ` (${finding.location.path}:${finding.location.startLine})` : '';
    log(`  [${finding.severity}] ${finding.title}${loc}`);
  }

  // 5. Run the LLM judge
  log('Running judge...');
  const judgeResult = await runJudge(meta, report.findings, options.apiKey);
  log('Judge complete');

  // 6. Determine pass/fail
  const passed = evalPassed(meta, judgeResult.response);
  log(`Result: ${passed ? 'PASS' : 'FAIL'}`);

  return {
    name,
    meta,
    passed,
    report,
    judgeResponse: judgeResult.response,
    logs,
    durationMs: Date.now() - startTime,
    skillUsage: report.usage,
    judgeUsage: judgeResult.usage,
  };
}
