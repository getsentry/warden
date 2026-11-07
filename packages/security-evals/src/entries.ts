import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';

/** Benchmark corpus that seeds most entries. */
const CORPUS_PATH = join(
  import.meta.dirname,
  '..', '..', 'docs', 'src', 'data', 'benchmarking', 'sentry-vulnerability-corpus.json',
);

/** Hand-picked cases for bug classes the corpus does not cover, one directory per owning skill. */
const CASES_DIR = join(import.meta.dirname, '..', 'cases');

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

const CaseSchema = z.object({
  kind: z.enum(['bug', 'clean']),
  summary: z.string(),
  repository: z.string(),
  ref: z.string().regex(/^[0-9a-f]{40}$/),
  targets: z.array(z.string()).min(1),
  source: z.string(),
});

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

/** Load hand-picked cases. Ids read as `<owning-skill>/<case>`. */
export function loadCaseEntries(dir = CASES_DIR): SuiteEntry[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((owner) => owner.isDirectory())
    .flatMap((owner) => readdirSync(join(dir, owner.name))
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const data = CaseSchema.parse(JSON.parse(readFileSync(join(dir, owner.name, file), 'utf8')));
        return {
          id: `${owner.name}/${basename(file, '.json')}`,
          source: 'case' as const,
          kind: data.kind,
          repository: data.repository,
          ref: data.ref,
          targets: data.targets,
          summary: data.summary,
        };
      }))
    .sort((a, b) => a.id.localeCompare(b.id));
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
