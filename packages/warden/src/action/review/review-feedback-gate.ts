/**
 * Review Feedback Gate
 *
 * Single owner of the "is this run still analyzing the current PR head?"
 * check that guards every PR review feedback mutation (posting reviews,
 * resolving threads, replying, dismissing reviews).
 */

import type { Octokit } from '@octokit/rest';
import { Sentry } from '../../sentry.js';
import { warnAction } from '../../cli/output/tty.js';
import { sleep } from '../../sdk/retry.js';
import type { EventContext } from '../../types/index.js';

export type ReviewFeedbackWritability = 'writable' | 'blocked' | 'unknown';

const FRESHNESS_TTL_MS = 10_000;
const HEAD_FETCH_ATTEMPTS = 3;
const HEAD_FETCH_RETRY_DELAY_MS = 500;

/**
 * Guards PR review feedback writes behind a head-freshness check.
 *
 * States returned by {@link ReviewFeedbackGate.check}:
 * - `writable`: the PR head matched this run's head within the TTL window.
 * - `blocked`: no PR context, or the head advanced past this run. Permanent
 *   for the run; a head that advanced never becomes current again.
 * - `unknown`: the head could not be verified after retries. Writes must be
 *   skipped (fail closed), but the state is cached only briefly so later
 *   phases retry instead of disabling feedback for the whole run. Callers
 *   that suppress a blocking review because of `unknown` must fail the run
 *   instead of letting it pass silently.
 *
 * Results are memoized for a short TTL so bursts of writes share one
 * `pulls.get` call while long LLM phases still trigger a fresh check.
 */
export class ReviewFeedbackGate {
  private blocked = false;
  private cached?: { status: 'writable' | 'unknown'; at: number };

  constructor(
    private readonly octokit: Octokit,
    private readonly context: EventContext,
    private readonly options: { ttlMs?: number; attempts?: number; retryDelayMs?: number } = {}
  ) {}

  /** Report whether this run may still mutate PR review feedback. */
  async check(): Promise<ReviewFeedbackWritability> {
    const pullRequest = this.context.pullRequest;
    if (!pullRequest || this.blocked) {
      return 'blocked';
    }

    const ttlMs = this.options.ttlMs ?? FRESHNESS_TTL_MS;
    if (this.cached && Date.now() - this.cached.at < ttlMs) {
      return this.cached.status;
    }

    const attempts = this.options.attempts ?? HEAD_FETCH_ATTEMPTS;
    const retryDelayMs = this.options.retryDelayMs ?? HEAD_FETCH_RETRY_DELAY_MS;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const { data } = await this.octokit.pulls.get({
          owner: this.context.repository.owner,
          repo: this.context.repository.name,
          pull_number: pullRequest.number,
        });
        if (data.head.sha !== pullRequest.headSha) {
          this.blocked = true;
          warnAction(
            `Skipping PR review feedback because run head ${pullRequest.headSha} is no longer the PR head ${data.head.sha}`
          );
          return 'blocked';
        }
        this.cached = { status: 'writable', at: Date.now() };
        return 'writable';
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await sleep(retryDelayMs * attempt);
        }
      }
    }

    Sentry.captureException(lastError, { tags: { operation: 'fetch_current_pr_head' } });
    warnAction(
      `Could not verify the current PR head after ${attempts} attempts; skipping review feedback writes: ${lastError}`
    );
    this.cached = { status: 'unknown', at: Date.now() };
    return 'unknown';
  }

  /** True when review feedback writes are allowed right now. */
  async canWrite(): Promise<boolean> {
    return (await this.check()) === 'writable';
  }
}
