import { basename, dirname } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import { parsePatch, type DiffHunk, type HunkWithContext } from '../diff/index.js';
import type { EventContext, FileChange } from '../types/index.js';
import type { PreparedFile } from './types.js';

/**
 * Deterministic pre-pass for the built-in `integrity-review` skill.
 *
 * The skill reads every hunk with no path filter and expects findings on a
 * low single-digit percent of PRs, so most model calls find nothing. This
 * gate sends a hunk to the model only when a cheap signal matches, and on
 * `synchronize` only when the hunk overlaps the push that triggered the run.
 * Signals favor recall: a false match costs one model call, a miss is silent.
 */

interface HunkLines {
  filename: string;
  added: string[];
  removed: string[];
  context: string[];
  /** True when the reviewed changes touch a dependency manifest, so lockfile churn has a declared cause. */
  manifestChanged: boolean;
}

interface GateSignal {
  id: string;
  matches(hunk: HunkLines): boolean;
}

const INSTALL_HOOK_KEY = /"(?:pre|post)?install"\s*:|"prepare"\s*:|"prepublish(?:Only)?"\s*:|"(?:pre|post)pack"\s*:/;
const GIT_HOOK_PATH = /(?:^|\/)(?:\.husky|\.githooks|\.git\/hooks)\/|(?:^|\/)(?:lefthook\.ya?ml|\.pre-commit-config\.ya?ml|setup\.py)$/;
const GOVERNANCE_PATH = /(?:^|\/)CODEOWNERS$|^\.github\/(?:workflows|actions|rulesets)\/|^\.github\/settings\.ya?ml$|^\.gitlab-ci\.ya?ml$|^\.circleci\/|^\.buildkite\//;
const REGISTRY_CONFIG_PATH = /(?:^|\/)(?:\.npmrc|\.yarnrc(?:\.yml)?|pip\.conf|\.pypirc|settings\.xml)$/;
const DEPENDENCY_SOURCE = /["'](?:git\+|github:|file:|https?:\/\/)[^"']*["']|--(?:extra-)?index-url|\bregistry\s*[=:]/;
const DEPENDENCY_MANIFEST = /(?:^|\/)(?:package\.json|requirements[^/]*\.txt|pyproject\.toml|Pipfile|Gemfile|go\.mod|Cargo\.toml|composer\.json)$/;
const LOCKFILE_PATH = /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lock|poetry\.lock|Pipfile\.lock|uv\.lock|Cargo\.lock|go\.sum|Gemfile\.lock|composer\.lock)$/;
const LOCK_PIN = /\b(?:resolved|integrity|tarball|checksum|resolution|source|remote)\b|\bsha(?:1|256|384|512)[-:]|\sh1:/;
const LOCK_VERSION = /\bversion\b|@[\^~]?v?\d+\.\d|\sv\d+\.\d|\(\d+\.\d/;
// Package sources: scheme URLs (userinfo skipped), scp-style git remotes, and npm shorthands.
const SOURCE_REF = /\b([a-z][a-z0-9+.-]*):\/\/(?:[^@/\s"']*@)?([^/\s"'#:?]+)|\b[\w.-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}):(?!\/)|\b(github|gitlab|bitbucket|file):(?!\/)/gi;
const DECODE_CALL = /\batob\(|b64decode|base64\s+-d|Buffer\.from\([^)]*['"](?:base64|hex)['"]|zlib\.|fromCharCode\(|codecs\.decode|\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){7,}/;
const HIDDEN_UNICODE = /[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/;
const LONG_TOKEN = /[A-Za-z0-9+/]{40,}={0,2}/g;
const HASH_PREFIX = /sha(?:1|256|384|512)(?:-|[:=]\s*)$/;
const DATE_OR_CHANCE = /datetime\(|timedelta\(|Date\.now\(|new Date\(|time\.time\(|time\.Now\(|\.now\(|utcnow\(|getTime\(\)|\b1[6-9]\d{8}\b|\b20\d{2}-\d{2}-\d{2}\b|\b20\d{2}\s*,\s*\d{1,2}\s*,\s*\d{1,2}\b|random\(|Math\.random|gethostname|os\.hostname/;
const DESTRUCTIVE_WORD = /\b(?:delete|remove|drop|truncate|purge|wipe|destroy|unlink|rmtree|rmdir|overwrite|disable)\w*/i;
const DESTRUCTIVE_OP = /\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b|\bTRUNCATE\s+(?:TABLE\s+)?\w|\bDELETE\s+FROM\b|\brm\s+-[a-zA-Z]*[rR][a-zA-Z]*\b|shutil\.rmtree|fs(?:\.promises)?\.(?:rm|rmdir)(?:Sync)?\(|push\s+(?:-f\b|--force)|reset\s+--hard|\.objects\.all\(\)\.delete\(/;
const REVIEWER_DIRECTED = /\b(?:ai|llm|automated|bot|copilot|claude|gpt|chatgpt|gemini|warden|coderabbit)\b[^\n]{0,40}\b(?:review(?:er|ers)?|scanner|auditor)s?\b|ignore (?:all )?(?:previous|prior|above) instructions|\bdo not (?:flag|report|review)\b|\bdon'?t (?:flag|report|review)\b|\bskip (?:this|the) (?:file|block|check|review)\b|\bpre-?approved\b|\balready (?:been )?(?:approved|reviewed)\b|\bno need to (?:review|check)\b/i;
const CONTROL_TERM = /\baudit|\bauthori[sz]|\bauthenticat|\bpermission|\bhas_access|write_access|\bis_admin|\bis_superuser|signature|\bcsrf|rate_?limit|ratelimit|\bvalidat|\bassert|captureException|capture_exception|\bdef test_|\b(?:it|test|describe)\(/i;
const EARLY_ALLOW = /\breturn\s+(?:True|true)\b|\bnext\(\)|\ballow(?:ed)?\s*=\s*(?:True|true)\b/;
const SUPPRESSION = /\bnosec\b|eslint-disable|#\s*noqa|semgrep|nolint|@skip|pytest\.mark\.(?:skip|xfail)|unittest\.skip|\bx(?:it|describe)\(|\.(?:only|skip)\(|t\.Skip\(|addFilter\(|logging\.Filter|\baudit|setLevel\(|except[^:\n]*:\s*pass\b|catch\s*(?:\([^)]*\))?\s*\{\s*\}/i;
const INFRA_PATH = /\.(?:tf|tfvars|hcl|ya?ml|json)$|(?:^|\/)Dockerfile[^/]*$/;
const PRIVILEGE = /["']\*["']|\bAdministratorAccess\b|\bcluster-admin\b|privileged:\s*true|0\.0\.0\.0\/0|::\/0|hostNetwork:\s*true|hostPath:|runAsUser:\s*0\b|deletion_protection\s*=\s*false|skip_final_snapshot\s*=\s*true|\bPrincipal\b|encrypted\s*=\s*false/;

const MIN_DELETED_LINES = 10;
const MIN_DELETED_RATIO = 0.8;
const MIN_TOKEN_ENTROPY = 4.3;
const MAX_LINE_LENGTH = 1000;

function shannonEntropy(text: string): number {
  const counts = new Map<string, number>();
  for (const char of text) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / text.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** True for base64-like literals; skips hex digests and integrity hashes, which stay below the entropy floor or carry a hash prefix. Lockfile hashes go through `lockfile-drift` instead. */
function hasEncodedLiteral(line: string): boolean {
  for (const match of line.matchAll(LONG_TOKEN)) {
    const token = match[0];
    if (HASH_PREFIX.test(line.slice(0, match.index))) continue;
    if (!/\d/.test(token)) continue;
    if (shannonEntropy(token) >= MIN_TOKEN_ENTROPY) return true;
  }
  return false;
}

const anyLine = (lines: string[], pattern: RegExp) => lines.some((line) => pattern.test(line));

/** Collect `scheme://host` keys for every package source on the lines, so a move to a new host or transport shows up. */
function sourceHosts(lines: string[]): Set<string> {
  const hosts = new Set<string>();
  for (const line of lines) {
    for (const [, scheme, host, scpHost, shorthand] of line.matchAll(SOURCE_REF)) {
      if (scheme && host) hosts.add(`${scheme.toLowerCase()}://${host.toLowerCase()}`);
      else if (scpHost) hosts.add(`ssh://${scpHost.toLowerCase()}`);
      else if (shorthand) hosts.add(`${shorthand.toLowerCase()}:`);
    }
  }
  return hosts;
}

/** True when a hunk swaps a package source for a host or scheme its removed lines did not use. */
function changesSourceHost(h: HunkLines): boolean {
  const before = sourceHosts(h.removed);
  if (before.size === 0) return false;
  return [...sourceHosts(h.added)].some((host) => !before.has(host));
}

const SIGNALS: GateSignal[] = [
  {
    id: 'install-hook',
    matches: (h) =>
      GIT_HOOK_PATH.test(h.filename) ||
      (basename(h.filename) === 'package.json' &&
        (anyLine(h.added, INSTALL_HOOK_KEY) || anyLine(h.removed, INSTALL_HOOK_KEY))),
  },
  {
    id: 'encoded-content',
    matches: (h) =>
      h.added.some(
        (line) =>
          line.length > MAX_LINE_LENGTH ||
          HIDDEN_UNICODE.test(line) ||
          DECODE_CALL.test(line) ||
          hasEncodedLiteral(line)
      ),
  },
  {
    id: 'deletion-heavy',
    matches: (h) =>
      h.removed.length >= MIN_DELETED_LINES &&
      h.removed.length / (h.removed.length + h.added.length) >= MIN_DELETED_RATIO,
  },
  {
    id: 'governance-file',
    matches: (h) => GOVERNANCE_PATH.test(h.filename),
  },
  {
    id: 'dependency-source',
    matches: (h) =>
      REGISTRY_CONFIG_PATH.test(h.filename) ||
      (DEPENDENCY_MANIFEST.test(h.filename) && anyLine(h.added, DEPENDENCY_SOURCE)),
  },
  {
    // Pins that change with no manifest change in the PR, with no version change in the hunk, or toward a new source host.
    id: 'lockfile-drift',
    matches: (h) =>
      LOCKFILE_PATH.test(h.filename) &&
      anyLine(h.added, LOCK_PIN) &&
      (!h.manifestChanged || !anyLine(h.added, LOCK_VERSION) || changesSourceHost(h)),
  },
  {
    id: 'conditional-destructive',
    matches: (h) =>
      anyLine(h.added, DATE_OR_CHANCE) &&
      (anyLine(h.added, DESTRUCTIVE_WORD) || anyLine(h.context, DESTRUCTIVE_WORD)),
  },
  {
    id: 'destructive-op',
    matches: (h) => anyLine(h.added, DESTRUCTIVE_OP),
  },
  {
    id: 'reviewer-directed',
    matches: (h) => anyLine(h.added, REVIEWER_DIRECTED),
  },
  {
    id: 'control-removal',
    matches: (h) => anyLine(h.removed, CONTROL_TERM),
  },
  {
    id: 'control-bypass',
    matches: (h) =>
      anyLine(h.added, EARLY_ALLOW) && (anyLine(h.added, CONTROL_TERM) || anyLine(h.context, CONTROL_TERM)),
  },
  {
    id: 'suppression',
    matches: (h) => anyLine(h.added, SUPPRESSION),
  },
  {
    id: 'privilege-grant',
    matches: (h) => INFRA_PATH.test(h.filename) && anyLine(h.added, PRIVILEGE),
  },
];

function splitHunkLines(filename: string, hunk: DiffHunk, manifestChanged: boolean): HunkLines {
  const lines: HunkLines = { filename, added: [], removed: [], context: [], manifestChanged };
  for (const line of hunk.lines) {
    if (line.startsWith('+')) lines.added.push(line.slice(1));
    else if (line.startsWith('-')) lines.removed.push(line.slice(1));
    else lines.context.push(line.slice(1));
  }
  return lines;
}

/**
 * Return the ids of every gate signal that matches a hunk. Pass `manifestChanged`
 * when the reviewed changes touch a dependency manifest, so routine lockfile bumps skip the model.
 */
export function matchIntegritySignals(hunk: HunkWithContext, manifestChanged = false): string[] {
  const lines = splitHunkLines(hunk.filename, hunk.hunk, manifestChanged);
  lines.context.push(...hunk.contextBefore, ...hunk.contextAfter);
  return SIGNALS.filter((signal) => signal.matches(lines)).map((signal) => signal.id);
}

type LineRange = [start: number, end: number];

/**
 * Inclusive new-side span, widened by one trailing line. A deletion-only hunk
 * (newCount 0) sits between newStart and newStart + 1, and coalesced hunks end
 * on an exclusive bound, so the extra line keeps a push deletion next to an
 * earlier edit inside the hunk it touched. A false overlap costs one model call.
 */
function newSideRange(hunk: Pick<DiffHunk, 'newStart' | 'newCount'>): LineRange {
  return [hunk.newStart, hunk.newStart + hunk.newCount];
}

/** Map each pushed file to the new-side ranges it changed, or 'all' when GitHub omitted the patch. */
function buildPushRanges(files: FileChange[]): Map<string, LineRange[] | 'all'> {
  const ranges = new Map<string, LineRange[] | 'all'>();
  for (const file of files) {
    ranges.set(file.filename, file.patch ? parsePatch(file.patch).map(newSideRange) : 'all');
  }
  return ranges;
}

function overlapsPush(hunk: HunkWithContext, pushRanges: Map<string, LineRange[] | 'all'>): boolean {
  const ranges = pushRanges.get(hunk.filename);
  if (ranges === undefined) return false;
  if (ranges === 'all') return true;
  const [start, end] = newSideRange(hunk.hunk);
  return ranges.some(([pushStart, pushEnd]) => start <= pushEnd && pushStart <= end);
}

/** True when the skill is the package's own `integrity-review`, not a repo-local override with the same name. */
function isBuiltinIntegrityReview(skill: SkillDefinition): boolean {
  return (
    skill.name === 'integrity-review' &&
    skill.rootDir !== undefined &&
    basename(skill.rootDir) === 'integrity-review' &&
    basename(dirname(skill.rootDir)) === 'builtin-skills'
  );
}

export interface HunkGateResult {
  files: PreparedFile[];
  skippedHunks: number;
  pushScoped: boolean;
}

/**
 * Apply the integrity-review gate to prepared files. Returns undefined for
 * every other skill. Text aimed at reviewers in the PR title or body sends
 * every eligible hunk to the model, because that signal has no hunk of its own.
 */
export function applyIntegrityGate(
  skill: SkillDefinition,
  context: EventContext,
  files: PreparedFile[]
): HunkGateResult | undefined {
  if (!isBuiltinIntegrityReview(skill)) return undefined;

  const pr = context.pullRequest;
  const push = context.action === 'synchronize' ? pr?.push : undefined;
  const pushRanges = push ? buildPushRanges(push.files) : undefined;
  const prTextDirected = REVIEWER_DIRECTED.test(`${pr?.title ?? ''}\n${pr?.body ?? ''}`);
  // Push-scoped runs only see the push, so an earlier manifest change in the PR does not explain its lockfile edits.
  const manifestChanged = (push?.files ?? pr?.files ?? []).some((file) => DEPENDENCY_MANIFEST.test(file.filename));

  let skippedHunks = 0;
  const gated: PreparedFile[] = [];
  for (const file of files) {
    const hunks = file.hunks.filter((hunk) => {
      const keep =
        (!pushRanges || overlapsPush(hunk, pushRanges)) &&
        (prTextDirected || matchIntegritySignals(hunk, manifestChanged).length > 0);
      if (!keep) skippedHunks++;
      return keep;
    });
    if (hunks.length > 0) gated.push({ filename: file.filename, hunks });
  }

  return { files: gated, skippedHunks, pushScoped: pushRanges !== undefined };
}
