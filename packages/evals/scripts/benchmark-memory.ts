import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, closeSync, copyFileSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parse } from 'dotenv';
import { selectOpenRouterKey } from './benchmark-credentials.js';
import { installInferenceAudit } from '../src/inference-audit.js';
import type { ReviewMemoryAccess, SkillReport } from '@sentry/warden';

const source = resolve(import.meta.dirname, '../../..');
const script = fileURLToPath(import.meta.url);
const { values } = parseArgs({ options: {
  root: { type: 'string' }, repo: { type: 'string' }, model: { type: 'string', default: 'openrouter/x-ai/grok-4.5' },
  'env-file': { type: 'string' }, worker: { type: 'boolean' }, pass: { type: 'string' }, sha: { type: 'string' },
} });
if (!values.root || !values.repo) throw new Error('Use --root <new output directory> --repo <dedicated Sentry checkout>');
const root = resolve(values.root);
const repo = resolve(values.repo);
const model = values.model;
const auxiliaryModel = 'openrouter/openai/gpt-5.6-luna';
const corpusPath = join(source, 'packages/docs/src/data/benchmarking/sentry-vulnerability-corpus.json');
const corpus: { findings: { id: string; sha: string; code: { path: string } }[] } = JSON.parse(readFileSync(corpusPath, 'utf8'));
const shas = [...new Set(corpus.findings.map((finding) => finding.sha))].sort();
const skillPath = join(source, 'packages/warden/src/builtin-skills/security-review');
const scan = { maxFiles: 200, maxChangedLines: 50_000 };
const settings = { model, auxiliaryModel, runtime: 'pi' as const, effort: 'high' as const, auxiliaryEffort: 'high' as const,
  concurrency: 4, parallel: true, maxTurns: 100, verifyFindings: true, postProcessFindings: true, captureTraces: true, scan };
function json(path: string, value: unknown) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}
function git(args: string[]) { return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim(); }
function targets(sha: string) { return [...new Set(corpus.findings.filter((finding) => finding.sha === sha).map((finding) => finding.code.path))].sort(); }
function credentials() {
  const env = values['env-file'] ? parse(readFileSync(values['env-file'])) : {};
  const key = selectOpenRouterKey(process.env, env);
  process.env['WARDEN_OPENROUTER_API_KEY'] = key;
  process.env['OPENROUTER_API_KEY'] = key;
}

async function worker(pass: string, sha: string) {
  if (!['1', '2'].includes(pass) || !shas.includes(sha)) throw new Error('Invalid shard');
  const directory = join(root, `pass${pass}`, sha);
  if (git(['rev-parse', 'HEAD']) !== sha) throw new Error('Checkout changed');
  process.env['PI_CODING_AGENT_DIR'] = join(directory, 'pi-agent');
  process.env['WARDEN_OFFLINE'] = 'true'; // Freeze catalog; inference remains enabled.
  const audit = installInferenceAudit(join(directory, 'audit'));
  credentials();
  const [{ runSkill, prepareFiles }, { buildFileEventContext }, { resolveSkillAsync }, { createFileReviewMemory }] = await Promise.all([
    import('../../warden/src/sdk/runner.js'), import('../../warden/src/cli/context.js'), import('../../warden/src/skills/loader.js'), import('./legacy-memory-file.js'),
  ]);
  const { ensureLocalTracing } = await import('../../warden/src/sentry.js');
  ensureLocalTracing();
  const memoryPath = join(directory, 'memory.json');
  const store = createFileReviewMemory({ path: memoryPath, repository: 'getsentry/sentry', repoPath: repo });
  const memory: ReviewMemoryAccess = {
    async search(input) {
      const found = await store.search(input);
      appendFileSync(join(directory, 'memory-events.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), operation: 'search', input, memories: found })}\n`);
      return found;
    },
    async update(input) {
      const result = await store.update(input);
      appendFileSync(join(directory, 'memory-events.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), operation: 'update', input, result })}\n`);
      return result;
    },
  };
  const context = await buildFileEventContext({ patterns: targets(sha), cwd: repo, scan });
  const actual = context.pullRequest?.files.map((file) => file.filename).sort();
  if (JSON.stringify(actual) !== JSON.stringify(targets(sha))) throw new Error('Target coverage mismatch');
  const prepared = prepareFiles(context, { scan });
  if (prepared.skippedFiles.length) throw new Error('Targets were skipped');
  const expectedChunks = prepared.files.reduce((sum, file) => sum + file.hunks.length, 0);
  json(join(directory, 'coverage-plan.json'), prepared.files.map((file) => ({ filename: file.filename, hunks: file.hunks })));
  const skill = await resolveSkillAsync(skillPath, repo);
  const startedAt = new Date().toISOString();
  let chunks = 0;
  const report = await runSkill(skill, context, { ...settings, memory, callbacks: {
    onChunkComplete(chunk) {
      const { trace, ...compact } = chunk;
      const id = String(++chunks).padStart(4, '0');
      if (trace) json(join(directory, 'traces', `${id}.json`), trace);
      appendFileSync(join(directory, 'chunks.jsonl'), `${JSON.stringify({ ...compact, traceFile: trace ? `traces/${id}.json` : undefined })}\n`);
      console.log(`${new Date().toISOString()} pass${pass} ${sha.slice(0, 8)} chunk ${chunks} ${chunk.failed || chunk.extractionFailed ? 'FAILED' : 'complete'}`);
    },
    onFindingProcessing(event) { appendFileSync(join(directory, 'postprocess.jsonl'), `${JSON.stringify(event)}\n`); },
  } });
  const { traces, ...compact } = report;
  // Preserve the native report trace collection as separate files too.
  for (const [index, trace] of (traces ?? []).entries()) json(join(directory, 'traces', `report-${index}.json`), trace);
  json(join(directory, 'report.json'), compact);
  copyFileSync(memoryPath, join(directory, 'memory-after.json'));
  json(join(directory, 'completed.json'), { startedAt, endedAt: new Date().toISOString(), chunks,
    expectedChunks, success: chunks === expectedChunks && !report.error && !report.failedHunks && !report.failedExtractions && !report.skippedFiles?.length,
    findings: report.findings.length, calls: audit.calls.length,
    billedUSD: audit.calls.reduce((sum, call) => sum + (call.costUSD ?? 0), 0),
    unresolvedCalls: audit.calls.filter((call) => call.status !== 'settled').map((call) => call.id),
  });
  audit.restore();
}

async function main() {
  mkdirSync(root, { recursive: true });
  const lock = openSync(join(root, 'driver.lock'), 'wx', 0o600);
  writeFileSync(lock, String(process.pid));
  const state: { status: string; pid: number; childPid?: number; pass?: number; sha?: string; completed: string[]; error?: string } = { status: 'preparing', pid: process.pid, completed: [] };
  const save = () => json(join(root, 'state.json'), state);
  try {
    if (existsSync(join(root, 'manifest.json'))) throw new Error('Existing run: inspect artifacts before any continuation. Attempted shards are never rerun automatically.');
    if (git(['status', '--porcelain'])) throw new Error('Dedicated Sentry checkout must be clean');
    credentials();
    mkdirSync(join(root, 'pi-agent'), { recursive: true });
    process.env['PI_CODING_AGENT_DIR'] = join(root, 'pi-agent');
    const piPackage = join(source, 'packages/warden/node_modules/@earendil-works/pi-coding-agent');
    const piManifest = JSON.parse(readFileSync(join(piPackage, 'package.json'), 'utf8'));
    const { ModelRuntime } = await import(pathToFileURL(join(piPackage, piManifest.exports['.'].import)).href);
    const runtime = await ModelRuntime.create();
    await runtime.refresh({ providers: ['openrouter'], allowNetwork: true, signal: AbortSignal.timeout(60_000) });
    const selectedModels = [model, auxiliaryModel].map((selector) => {
      const [provider, ...parts] = selector.split('/');
      const resolved = runtime.getModel(provider, parts.join('/'));
      if (!resolved) throw new Error(`Model unavailable: ${selector}`);
      return resolved;
    });
    json(join(root, 'models.json'), selectedModels);
    copyFileSync(corpusPath, join(root, 'corpus.json'));
    json(join(root, 'manifest.json'), { createdAt: new Date().toISOString(), source, repo, settings,
      corpusEntries: corpus.findings.length, shas, skillSHA256: createHash('sha256').update(readFileSync(join(skillPath, 'SKILL.md'))).digest('hex'),
      spendingLimit: null, memoryPolicy: 'Empty per-SHA stores in pass1; pass2 copies corresponding pass1 snapshot. Both passes can write notes.',
      limitation: 'Same-code replay. No evidence of safe reuse after code changes. Pass1 includes memory writing and within-pass reuse.',
    });
    for (const pass of [1, 2]) for (const sha of shas) {
      if (existsSync(join(root, 'STOP'))) throw new Error('Stopped by operator');
      const directory = join(root, `pass${pass}`, sha);
      if (existsSync(directory)) throw new Error(`Attempt already exists: ${directory}`);
      git(['checkout', '--detach', sha]);
      mkdirSync(join(directory, 'traces'), { recursive: true });
      cpSync(join(root, 'pi-agent'), join(directory, 'pi-agent'), { recursive: true });
      if (pass === 2) copyFileSync(join(root, 'pass1', sha, 'memory-after.json'), join(directory, 'memory.json'));
      else json(join(directory, 'memory.json'), { formatVersion: 1, repository: 'getsentry/sentry', memories: [] });
      copyFileSync(join(directory, 'memory.json'), join(directory, 'memory-before.json'));
      json(join(directory, 'targets.json'), targets(sha));
      state.status = 'running'; state.pass = pass; state.sha = sha; save();
      const child = spawn(process.execPath, ['--import', 'tsx', script, '--worker', '--root', root, '--repo', repo, '--pass', String(pass), '--sha', sha, '--model', model], { cwd: source, env: process.env, stdio: 'inherit' });
      state.childPid = child.pid; save();
      const code = await new Promise<number | null>((resolveExit, reject) => { child.once('error', reject); child.once('exit', resolveExit); });
      delete state.childPid;
      if (code !== 0 || !existsSync(join(directory, 'completed.json'))) throw new Error(`Shard exited ${code}; preserve and inspect failed chunks`);
      const completed = JSON.parse(readFileSync(join(directory, 'completed.json'), 'utf8'));
      if (!completed.success || completed.unresolvedCalls.length) throw new Error('Coverage or billing needs inspection before continuing');
      state.completed.push(`pass${pass}/${sha}`); save();
      const report: SkillReport = JSON.parse(readFileSync(join(directory, 'report.json'), 'utf8'));
      console.log(`pass${pass} ${sha.slice(0, 8)} complete: ${report.findings.length} findings, $${completed.billedUSD.toFixed(4)}`);
    }
    state.status = 'awaiting-semantic-scoring'; save();
  } catch (error) {
    state.status = 'needs-attention'; state.error = error instanceof Error ? error.message : String(error); save(); throw error;
  } finally { closeSync(lock); unlinkSync(join(root, 'driver.lock')); }
}
if (values.worker) await worker(values.pass ?? '', values.sha ?? '');
else await main();
