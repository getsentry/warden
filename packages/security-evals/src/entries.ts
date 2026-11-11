import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';

/** Benchmark corpus that seeds most entries. */
const CORPUS_PATH = join(
  import.meta.dirname,
  '..', '..', 'docs', 'src', 'data', 'benchmarking', 'sentry-vulnerability-corpus.json',
);

/** Hand-picked cases for bug classes the corpus does not cover, one directory per owning skill. */
export const CASES_DIR = join(import.meta.dirname, '..', 'cases');

/** Summary the scaffolder writes. The validator rejects any case that still has it. */
export const SUMMARY_TODO = 'TODO: one sentence naming the bug, where it lives, and what an attacker gets';

/**
 * One scored expectation. A `bug` entry is a hit when a skill reports it. A
 * `clean` entry describes a bug the code at `ref` already fixed, so a hit there
 * is a false positive.
 */
export interface SuiteEntry {
  id: string;
  source: 'corpus' | 'case';
  kind: 'bug' | 'clean';
  repository: string;
  ref: string;
  /** Files the skills scan for this entry. The rest of the worktree is context. */
  targets: string[];
  /** Line range of the bug in the first target, when known. */
  lines?: string;
  summary: string;
}

/** Entries that share a repository and ref run as one Warden pass over one worktree. */
export interface SuiteShard {
  repository: string;
  ref: string;
  targets: string[];
  entries: SuiteEntry[];
}

const CorpusSchema = z.object({
  findings: z.array(z.object({
    id: z.string(),
    repository: z.string(),
    sha: z.string(),
    summary: z.string(),
    code: z.object({ path: z.string(), lines: z.string().optional() }),
  })),
});

const RelativePath = z.string().min(1).refine(
  (path) => !path.startsWith('/') && !path.split('/').includes('..'),
  'must be a repository-relative path',
);

/**
 * One file under `cases/<owning-skill>/`. A bug case pairs with a clean case
 * that shares its source, targets, and summary at the fixed ref, unless
 * `noClean` says why it cannot.
 */
export const CaseSchema = z.object({
  kind: z.enum(['bug', 'clean']),
  summary: z.string().min(1),
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  ref: z.string().regex(/^[0-9a-f]{40}$/),
  targets: z.array(RelativePath).min(1),
  source: z.url(),
  noClean: z.string().min(1).optional(),
}).strict().refine((data) => data.kind === 'bug' || data.noClean === undefined, {
  message: 'noClean only applies to bug cases',
  path: ['noClean'],
});

export type CaseData = z.infer<typeof CaseSchema>;

/** A parsed case file and the skill directory that owns it. */
export interface CaseFile {
  id: string;
  owner: string;
  data: CaseData;
}

/** Load one entry per corpus finding. */
export function loadCorpusEntries(path = CORPUS_PATH): SuiteEntry[] {
  const corpus = CorpusSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  return corpus.findings.map((finding) => ({
    id: finding.id,
    source: 'corpus',
    kind: 'bug',
    repository: finding.repository,
    ref: finding.sha,
    targets: [finding.code.path],
    lines: finding.code.lines,
    summary: finding.summary,
  }));
}

/** Parse every case file. Ids read as `<owning-skill>/<case>`. A bad file throws with its path. */
export function loadCaseFiles(dir = CASES_DIR): CaseFile[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((owner) => owner.isDirectory())
    .flatMap((owner) => readdirSync(join(dir, owner.name))
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const path = join(dir, owner.name, file);
        const parsed = CaseSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
        if (!parsed.success) {
          throw new Error(`${path}: ${z.prettifyError(parsed.error)}`);
        }
        return { id: `${owner.name}/${basename(file, '.json')}`, owner: owner.name, data: parsed.data };
      }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Load hand-picked cases as suite entries. */
export function loadCaseEntries(dir = CASES_DIR): SuiteEntry[] {
  return loadCaseFiles(dir).map(({ id, data }) => ({
    id,
    source: 'case',
    kind: data.kind,
    repository: data.repository,
    ref: data.ref,
    targets: data.targets,
    summary: data.summary,
  }));
}

/**
 * Keep entries matching any filter. A filter is an exact id, or a prefix
 * ending in `*` (`wrdn-dos-review/*`, `sentry-vuln-0*`). No filters keeps all.
 */
export function filterEntries(entries: SuiteEntry[], filters: string[]): SuiteEntry[] {
  if (filters.length === 0) return entries;
  const selected = entries.filter((entry) => filters.some((filter) => filter.endsWith('*')
    ? entry.id.startsWith(filter.slice(0, -1))
    : entry.id === filter));
  if (selected.length === 0) {
    throw new Error(`No entries match ${filters.join(', ')}`);
  }
  return selected;
}

/** Group entries into one shard per repository and ref. */
export function groupShards(entries: SuiteEntry[]): SuiteShard[] {
  const shards = new Map<string, SuiteShard>();
  for (const entry of entries) {
    const key = `${entry.repository}@${entry.ref}`;
    const shard = shards.get(key) ?? { repository: entry.repository, ref: entry.ref, targets: [], entries: [] };
    shard.entries.push(entry);
    shard.targets = [...new Set([...shard.targets, ...entry.targets])].sort();
    shards.set(key, shard);
  }
  return [...shards.values()].sort((a, b) => a.ref.localeCompare(b.ref));
}
