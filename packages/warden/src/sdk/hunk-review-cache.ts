import { createHash } from 'node:crypto';
import type { SkillDefinition } from '../config/schema.js';
import { hunkContextFingerprint, type HunkWithContext } from '../diff/index.js';
import { buildHunkSystemPrompt, buildHunkUserPrompt, type PRPromptContext } from './prompt.js';
import { changedToolEvidence } from './runtimes/pi-file-tools.js';
import type { ToolEvidence } from './runtimes/types.js';
import type { HunkAnalysisResult, PreparedFile, SkillRunnerOptions } from './types.js';

/** A hunk review that found nothing, with every file-tool call it made. */
export interface CleanHunkReview {
  key: string;
  skill: string;
  evidence: ToolEvidence[];
}

/**
 * Stores clean hunk reviews between runs so a later run can skip a hunk whose review would see the
 * same prompt and the same tool results. Implementations fail open: recall returns nothing and record
 * drops reviews when storage is unavailable.
 */
export interface HunkReviewCache {
  recall(keys: string[]): Promise<Map<string, ToolEvidence[]>>;
  record(reviews: CleanHunkReview[]): Promise<void>;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** Fixed hunk used to fingerprint the user prompt template, so template changes invalidate reviews. */
const TEMPLATE_PROBE: HunkWithContext = {
  filename: 'probe.txt',
  hunk: { oldStart: 1, oldCount: 1, newStart: 1, newCount: 1, content: '@@ -1 +1 @@\n-a\n+b', lines: ['-a', '+b'] },
  contextBefore: [],
  contextAfter: [],
  contextStartLine: 1,
  language: 'text',
};

/** Most tool calls one stored review may carry; the service rejects larger records. */
const MAX_EVIDENCE_PER_REVIEW = 200;

/**
 * Key a hunk review by what the agent is shown: the skill's system prompt, the user prompt template,
 * PR title and body, the hunk and its surrounding lines without positions, and the model settings.
 * The title and body stay in the key so text in one PR's description cannot earn a clean review that
 * another PR reuses. Recalled memory and the changed-file list are left out: both change on most
 * pushes, and memory is lower-authority guidance that expires with the review.
 */
export function hunkReviewKey(
  skill: SkillDefinition,
  hunkCtx: HunkWithContext,
  options: Pick<SkillRunnerOptions, 'model' | 'runtime' | 'effort' | 'maxTurns'>,
  prContext?: Pick<PRPromptContext, 'title' | 'body'>,
): string {
  return sha256(JSON.stringify([
    skill.name,
    sha256(JSON.stringify([prContext?.title ?? null, prContext?.body ?? null])),
    skill.tools ?? null,
    sha256(buildHunkSystemPrompt(skill)),
    sha256(buildHunkUserPrompt(skill, TEMPLATE_PROBE)),
    hunkContextFingerprint(hunkCtx),
    options.runtime ?? 'pi',
    options.model ?? null,
    options.effort ?? null,
    options.maxTurns ?? null,
  ]));
}

/** One run's view of the cache: which hunks can be reused and which clean reviews to store. */
export class HunkReviewSession {
  private readonly pending: CleanHunkReview[] = [];
  reused = 0;

  private constructor(
    private readonly cache: HunkReviewCache,
    private readonly skill: SkillDefinition,
    private readonly keys: Map<HunkWithContext, string>,
    private readonly recalled: Map<string, ToolEvidence[]>,
  ) {}

  /** Key every prepared hunk and recall earlier clean reviews in one call. */
  static async open(
    cache: HunkReviewCache,
    skill: SkillDefinition,
    files: PreparedFile[],
    options: SkillRunnerOptions,
    prContext?: Pick<PRPromptContext, 'title' | 'body'>,
  ): Promise<HunkReviewSession> {
    const keys = new Map<HunkWithContext, string>();
    for (const file of files) {
      for (const hunk of file.hunks) keys.set(hunk, hunkReviewKey(skill, hunk, options, prContext));
    }
    const recalled = await cache.recall([...new Set(keys.values())]);
    return new HunkReviewSession(cache, skill, keys, recalled);
  }

  /** Whether an earlier clean review of this hunk saw exactly what the checkout would show it now. */
  async reusable(hunk: HunkWithContext, repoPath: string): Promise<boolean> {
    const key = this.keys.get(hunk);
    const evidence = key ? this.recalled.get(key) : undefined;
    if (!evidence) return false;
    const changed = await changedToolEvidence(repoPath, evidence, this.skill.rootDir);
    if (changed.length > 0) return false;
    this.reused++;
    return true;
  }

  /** Remember a completed review if it found nothing and every tool call was recorded. */
  note(hunk: HunkWithContext, result: HunkAnalysisResult): void {
    const key = this.keys.get(hunk);
    if (!key || !result.evidence || result.failed || result.extractionFailed || result.findings.length > 0) return;
    if (result.evidence.length > MAX_EVIDENCE_PER_REVIEW) return;
    this.pending.push({ key, skill: this.skill.name, evidence: result.evidence });
  }

  /** Store this run's clean reviews. */
  async flush(): Promise<void> {
    if (this.pending.length > 0) await this.cache.record(this.pending.splice(0));
  }
}
