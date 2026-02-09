import { describe, it, expect } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { evaluateFix } from './judge.js';
import type { FixJudgeContext, FixJudgeInput } from './judge.js';
import type { ExistingComment } from '../../output/dedup.js';

/**
 * Live integration tests for the fix judge.
 * These call the real Haiku API to verify end-to-end behavior.
 * Gated by ANTHROPIC_API_KEY environment variable.
 */
describe.skipIf(!process.env['ANTHROPIC_API_KEY'])('evaluateFix (live)', () => {
  const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';

  const baseComment: ExistingComment = {
    id: 1,
    path: 'src/handler.ts',
    line: 15,
    title: 'SQL injection vulnerability',
    description:
      'User input is concatenated directly into SQL query without parameterization. Use parameterized queries instead.',
    contentHash: 'abc123',
    isWarden: true,
    threadId: 'thread-1',
  };

  function makeContext(patches: Map<string, string>): FixJudgeContext {
    return {
      octokit: {} as Octokit, // Tools that need octokit won't be called since we provide patches
      owner: 'test',
      repo: 'test',
      baseSha: 'base123',
      headSha: 'head456',
      patches,
    };
  }

  it('returns resolved when the fix clearly addresses the issue', async () => {
    const input: FixJudgeInput = {
      comment: baseComment,
      changedFiles: ['src/handler.ts'],
      codeBeforeFix: `
13: function getUser(id: string) {
14:   const query = "SELECT * FROM users WHERE id = '" + id + "'";
15:   return db.query(query);
16: }
`.trim(),
      codeAfterFix: `
13: function getUser(id: string) {
14:   const query = "SELECT * FROM users WHERE id = $1";
15:   return db.query(query, [id]);
16: }
`.trim(),
      commitMessages: ['Fix SQL injection in user handler'],
    };

    const patches = new Map([
      [
        'src/handler.ts',
        `@@ -13,4 +13,4 @@
-  const query = "SELECT * FROM users WHERE id = '" + id + "'";
-  return db.query(query);
+  const query = "SELECT * FROM users WHERE id = $1";
+  return db.query(query, [id]);`,
      ],
    ]);

    const result = await evaluateFix(input, makeContext(patches), apiKey);

    expect(result.usedFallback).toBe(false);
    expect(result.verdict.status).toBe('resolved');
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
    expect(result.usage.costUSD).toBeGreaterThan(0);
  }, 30_000);

  it('returns not_attempted when changes are unrelated', async () => {
    const input: FixJudgeInput = {
      comment: baseComment,
      changedFiles: ['src/utils.ts', 'README.md'],
      codeBeforeFix: `
13: function getUser(id: string) {
14:   const query = "SELECT * FROM users WHERE id = '" + id + "'";
15:   return db.query(query);
16: }
`.trim(),
      codeAfterFix: `
13: function getUser(id: string) {
14:   const query = "SELECT * FROM users WHERE id = '" + id + "'";
15:   return db.query(query);
16: }
`.trim(),
      commitMessages: ['Update README with new installation instructions'],
    };

    const patches = new Map([
      ['README.md', '@@ -1,3 +1,5 @@\n # Project\n+\n+## Installation\n+Run npm install'],
    ]);

    const result = await evaluateFix(input, makeContext(patches), apiKey);

    expect(result.usedFallback).toBe(false);
    expect(result.verdict.status).toBe('not_attempted');
    expect(result.usage.inputTokens).toBeGreaterThan(0);
  }, 30_000);

  it('returns attempted_failed when fix is incomplete', async () => {
    const comment: ExistingComment = {
      ...baseComment,
      title: 'XSS vulnerability in user display',
      description:
        'User-provided name and email are rendered without escaping. Both fields must be escaped.',
    };

    const input: FixJudgeInput = {
      comment,
      changedFiles: ['src/handler.ts'],
      codeBeforeFix: `
13: function renderUser(user: User) {
14:   return \`<div>
15:     <span class="name">\${user.name}</span>
16:     <span class="email">\${user.email}</span>
17:   </div>\`;
18: }
`.trim(),
      codeAfterFix: `
13: function renderUser(user: User) {
14:   return \`<div>
15:     <span class="name">\${escapeHtml(user.name)}</span>
16:     <span class="email">\${user.email}</span>
17:   </div>\`;
18: }
`.trim(),
      commitMessages: ['Escape user name in display'],
    };

    const patches = new Map([
      [
        'src/handler.ts',
        `@@ -14,3 +14,3 @@
-    <span class="name">\${user.name}</span>
+    <span class="name">\${escapeHtml(user.name)}</span>`,
      ],
    ]);

    const result = await evaluateFix(input, makeContext(patches), apiKey);

    expect(result.usedFallback).toBe(false);
    // The judge should detect that only name was escaped but email was not
    expect(result.verdict.status).toBe('attempted_failed');
    expect(result.verdict.reasoning).toBeTruthy();
  }, 30_000);

  it('populates usage stats', async () => {
    const input: FixJudgeInput = {
      comment: baseComment,
      changedFiles: ['src/handler.ts'],
      codeBeforeFix: 'const x = 1;',
      codeAfterFix: 'const x = 1;',
      commitMessages: ['chore: update deps'],
    };

    const result = await evaluateFix(input, makeContext(new Map()), apiKey);

    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
    expect(result.usage.costUSD).toBeGreaterThan(0);
  }, 30_000);
});
