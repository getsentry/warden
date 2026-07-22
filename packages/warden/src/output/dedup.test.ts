import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Octokit } from '@octokit/rest';
import {
  generateContentHash,
  generateFindingMetadata,
  generateMarker,
  parseWardenFindingMetadata,
  parseMarker,
  parseWardenComment,
  parseWardenFindingId,
  isWardenComment,
  deduplicateFindings,
  findingToExistingComment,
  fetchExistingComments,
  parseWardenSkills,
  updateWardenCommentBody,
  consolidateBatchFindings,
} from './dedup.js';
import type { Finding } from '../types/index.js';
import type { ExistingComment } from './dedup.js';

describe('generateContentHash', () => {
  it('generates consistent 8-char hex hash', () => {
    const hash = generateContentHash('SQL Injection', 'User input passed to query');
    expect(hash).toMatch(/^[a-f0-9]{8}$/);
  });

  it('returns same hash for same content', () => {
    const hash1 = generateContentHash('Title', 'Description');
    const hash2 = generateContentHash('Title', 'Description');
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different content', () => {
    const hash1 = generateContentHash('Title A', 'Description');
    const hash2 = generateContentHash('Title B', 'Description');
    expect(hash1).not.toBe(hash2);
  });
});

describe('generateMarker', () => {
  it('generates marker in expected format', () => {
    const marker = generateMarker('src/db.ts', 42, 'a1b2c3d4');
    expect(marker).toBe('<!-- warden:v1:src/db.ts:42:a1b2c3d4 -->');
  });

  it('handles paths with special characters', () => {
    const marker = generateMarker('src/utils/db-helper.ts', 100, 'abcd1234');
    expect(marker).toBe('<!-- warden:v1:src/utils/db-helper.ts:100:abcd1234 -->');
  });
});

describe('parseMarker', () => {
  it('parses valid marker', () => {
    const body = `**:warning: SQL Injection**

User input passed to query.

---
<sub>warden: security-review</sub>
<!-- warden:v1:src/db.ts:42:a1b2c3d4 -->`;

    const marker = parseMarker(body);
    expect(marker).toEqual({
      path: 'src/db.ts',
      line: 42,
      contentHash: 'a1b2c3d4',
    });
  });

  it('returns null for body without marker', () => {
    const body = '**:warning: Some Issue**\n\nDescription';
    expect(parseMarker(body)).toBeNull();
  });

  it('returns null for invalid marker format', () => {
    const body = '<!-- warden:invalid -->';
    expect(parseMarker(body)).toBeNull();
  });
});

describe('parseWardenComment', () => {
  it('parses comment with emoji', () => {
    const body = `**:warning: SQL Injection**

User input passed directly to query.

---
<sub>warden: security-review</sub>`;

    const parsed = parseWardenComment(body);
    expect(parsed).toEqual({
      title: 'SQL Injection',
      description: 'User input passed directly to query.',
    });
  });

  it('parses comment without emoji', () => {
    const body = `**Missing Validation**

No input validation on user data.

---
<sub>warden: code-review</sub>`;

    const parsed = parseWardenComment(body);
    expect(parsed).toEqual({
      title: 'Missing Validation',
      description: 'No input validation on user data.',
    });
  });

  it('strips legacy [ID] prefix from title', () => {
    const body = `**:warning: [2K5-29B] wasFailFastAborted checks wrong controller**

The function checks abortController.signal.aborted.

---
<sub>warden: notseer</sub>`;

    const parsed = parseWardenComment(body);
    expect(parsed).toEqual({
      title: 'wasFailFastAborted checks wrong controller',
      description: 'The function checks abortController.signal.aborted.',
    });
  });

  it('parses new format comment without emoji or ID prefix', () => {
    const body = `**wasFailFastAborted never detects fail-fast abort**

The function checks the wrong signal.

<sub>Identified by Warden [notseer] · 2K5-29B</sub>`;

    const parsed = parseWardenComment(body);
    expect(parsed).toEqual({
      title: 'wasFailFastAborted never detects fail-fast abort',
      description: 'The function checks the wrong signal.\n\n<sub>Identified by Warden [notseer] · 2K5-29B</sub>',
    });
  });

  it('returns null for non-Warden comment', () => {
    const body = 'This is a regular comment without the expected format.';
    expect(parseWardenComment(body)).toBeNull();
  });
});

describe('parseWardenFindingId', () => {
  it('parses finding ID from hidden metadata', () => {
    const metadata = generateFindingMetadata({
      id: 'WRZ-XPL',
      severity: 'high',
      confidence: 'medium',
    });
    const body = `**Issue**

Description

<sub>Identified by Warden · security-review · display-only</sub>
${metadata}`;

    expect(parseWardenFindingId(body)).toBe('WRZ-XPL');
  });

  it('parses finding IDs from the current and immediately prior footer formats', () => {
    expect(parseWardenFindingId('<sub>Identified by Warden · security-review · finding-42</sub>')).toBe(
      'finding-42'
    );
    expect(parseWardenFindingId('<sub>Identified by Warden security-review · WRZ-XPL</sub>')).toBe(
      'WRZ-XPL'
    );
  });

  it('does not treat a skill or historical footer metadata as a finding ID', () => {
    expect(parseWardenFindingId('<sub>Identified by Warden · security-review</sub>')).toBeUndefined();
    expect(
      parseWardenFindingId('<sub>Identified by Warden via `security-review` · high</sub>')
    ).toBeUndefined();
  });
});

describe('isWardenComment', () => {
  it('recognizes the current attribution format', () => {
    expect(isWardenComment('<sub>Identified by Warden · skill · ABC-123</sub>')).toBe(true);
  });

  it('recognizes a Warden marker', () => {
    expect(isWardenComment('<!-- warden:v1:file.ts:10:abc12345 -->')).toBe(true);
  });

  it('returns false for regular comments', () => {
    expect(isWardenComment('This is a regular comment.')).toBe(false);
  });
});

describe('fetchExistingComments', () => {
  it('preserves parsed Warden skill and finding ID from review comments', async () => {
    const graphql = vi.fn().mockResolvedValue({
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: 'thread-1',
                isResolved: false,
                comments: {
                  nodes: [
                    {
                      id: 'comment-node-1',
                      databaseId: 123,
                      body: `**SQL injection**

User input reaches a query.

<sub>Identified by Warden · security-review · WRZ-XPL</sub>
<!-- warden:v1:src/db.ts:42:abc12345 -->`,
                      path: 'src/db.ts',
                      line: 42,
                      originalLine: 40,
                      author: { login: 'warden-bot' },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    const comments = await fetchExistingComments(
      { graphql } as unknown as Octokit,
      'getsentry',
      'warden',
      123
    );

    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      id: 123,
      path: 'src/db.ts',
      line: 42,
      findingId: 'WRZ-XPL',
      isWarden: true,
      skills: ['security-review'],
      threadId: 'thread-1',
      actor: 'warden-bot',
    });
  });

  it('derives plain-text title and description for external review comments', async () => {
    const graphql = vi.fn().mockResolvedValue({
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: 'thread-1',
                isResolved: true,
                comments: {
                  nodes: [
                    {
                      id: 'comment-node-1',
                      databaseId: 456,
                      body: `<!-- metadata -->
<details><summary>Trace</summary>Hidden marker</details>

**Needs guard**

Use \`Number.isFinite\` before saving [the value](https://example.com).`,
                      path: 'src/db.ts',
                      line: 42,
                      originalLine: 40,
                      author: { login: 'reviewer' },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    const comments = await fetchExistingComments(
      { graphql } as unknown as Octokit,
      'getsentry',
      'warden',
      123
    );

    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      id: 456,
      isWarden: false,
      title: 'Needs guard Use Number.isFinite before saving the value.',
      description: 'Needs guard Use Number.isFinite before saving the value.',
    });
  });
});

describe('deduplicateFindings', () => {
  const baseFinding: Finding = {
    id: 'f1',
    severity: 'high',
    title: 'SQL Injection',
    description: 'User input passed to query',
    location: {
      path: 'src/db.ts',
      startLine: 42,
    },
  };

  it('returns all findings when no existing comments', async () => {
    const findings = [baseFinding];
    const result = await deduplicateFindings(findings, [], { hashOnly: true });
    expect(result.newFindings).toHaveLength(1);
    expect(result.newFindings[0]).toBe(baseFinding);
    expect(result.duplicateActions).toHaveLength(0);
  });

  it('returns all findings when findings array is empty', async () => {
    const existingComments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
      },
    ];

    const result = await deduplicateFindings([], existingComments, { hashOnly: true });
    expect(result.newFindings).toHaveLength(0);
    expect(result.duplicateActions).toHaveLength(0);
  });

  it('filters out exact hash matches and creates duplicate action', async () => {
    const existingComments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        isWarden: true,
        findingId: 'WRZ-XPL',
      },
    ];

    const result = await deduplicateFindings([baseFinding], existingComments, { hashOnly: true });
    expect(result.newFindings).toHaveLength(0);
    expect(result.duplicateActions).toHaveLength(1);
    expect(result.duplicateActions[0]!.type).toBe('update_warden');
    expect(result.duplicateActions[0]!.matchType).toBe('hash');
    expect(result.duplicateActions[0]!.finding.id).toBe('WRZ-XPL');
  });

  it('keeps findings with different content', async () => {
    const existingComments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
      },
    ];

    const differentFinding: Finding = {
      ...baseFinding,
      id: 'f2',
      title: 'XSS Vulnerability',
      description: 'Unescaped output in HTML',
    };

    const result = await deduplicateFindings([differentFinding], existingComments, {
      hashOnly: true,
    });
    expect(result.newFindings).toHaveLength(1);
    expect(result.newFindings[0]!.title).toBe('XSS Vulnerability');
    expect(result.duplicateActions).toHaveLength(0);
  });

  it('filters multiple duplicates and keeps unique findings', async () => {
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/db.ts', startLine: 42 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'medium',
      title: 'Missing Error Handling',
      description: 'No try-catch block',
      location: { path: 'src/api.ts', startLine: 100 },
    };

    const finding3: Finding = {
      id: 'f3',
      severity: 'low',
      title: 'Code Style',
      description: 'Inconsistent indentation',
      location: { path: 'src/utils.ts', startLine: 50 },
    };

    const existingComments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        isWarden: true,
      },
      {
        id: 2,
        path: 'src/utils.ts',
        line: 50,
        title: 'Code Style',
        description: 'Inconsistent indentation',
        contentHash: generateContentHash('Code Style', 'Inconsistent indentation'),
        isWarden: false,
      },
    ];

    const result = await deduplicateFindings([finding1, finding2, finding3], existingComments, {
      hashOnly: true,
    });
    expect(result.newFindings).toHaveLength(1);
    expect(result.newFindings[0]!.id).toBe('f2');
    expect(result.duplicateActions).toHaveLength(2);
    // First should be update_warden (isWarden: true)
    expect(result.duplicateActions[0]!.type).toBe('update_warden');
    // Second should be react_external (isWarden: false)
    expect(result.duplicateActions[1]!.type).toBe('react_external');
  });

  it('works without API key (hash-only mode)', async () => {
    const findings = [baseFinding];
    const existingComments: ExistingComment[] = [];

    const result = await deduplicateFindings(findings, existingComments, {});
    expect(result.newFindings).toHaveLength(1);
  });

  it('matches additional locations against Warden comments', async () => {
    // Simulates winner-flip: finding primary is now at b.ts, but our old comment is at a.ts
    const finding: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/b.ts', startLine: 20 },
      additionalLocations: [{ path: 'src/db.ts', startLine: 42 }],
    };

    const existingComments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        isWarden: true,
      },
    ];

    const result = await deduplicateFindings([finding], existingComments, { hashOnly: true });
    expect(result.newFindings).toHaveLength(0);
    expect(result.duplicateActions).toHaveLength(1);
    expect(result.duplicateActions[0]!.type).toBe('update_warden');
  });

  it('does not match additional locations against external comments', async () => {
    const finding: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/b.ts', startLine: 20 },
      additionalLocations: [{ path: 'src/db.ts', startLine: 42 }],
    };

    const existingComments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        isWarden: false,
      },
    ];

    const result = await deduplicateFindings([finding], existingComments, { hashOnly: true });
    expect(result.newFindings).toHaveLength(1);
    expect(result.duplicateActions).toHaveLength(0);
  });
});

describe('parseWardenSkills', () => {
  it('parses one skill from the current format', () => {
    expect(parseWardenSkills('<sub>Identified by Warden · notseer · ABC-123</sub>')).toEqual(['notseer']);
  });

  it('parses multiple skills from the current format', () => {
    expect(parseWardenSkills('<sub>Identified by Warden · skill1, skill2 · ABC-123</sub>')).toEqual([
      'skill1',
      'skill2',
    ]);
  });

  it('round-trips rendered skill names in both supported formats', () => {
    expect(
      parseWardenSkills('<sub>Identified by Warden · my skill &amp; checks · finding-42</sub>')
    ).toEqual(['my skill & checks']);
    expect(parseWardenSkills('<sub>Identified by Warden skill one, skill two · ABC-123</sub>')).toEqual([
      'skill one',
      'skill two',
    ]);
  });

  it('returns an empty array for regular comments and unsupported historical footers', () => {
    expect(parseWardenSkills('Regular comment')).toEqual([]);
    expect(parseWardenSkills('<sub>Identified by Warden via `skill1` · high</sub>')).toEqual([]);
    expect(parseWardenSkills('<sub>Identified by Warden [skill1] · ABC-123</sub>')).toEqual([]);
  });
});

describe('updateWardenCommentBody', () => {
  it('adds a skill to the current attribution', () => {
    const body = `**Issue**\n\nDescription\n\n<sub>Identified by Warden · skill1 · ABC-123</sub>`;
    expect(updateWardenCommentBody(body, 'skill2')).toContain(
      '<sub>Identified by Warden · skill1, skill2 · ABC-123</sub>'
    );
  });

  it('upgrades the immediately prior footer without dropping its ID', () => {
    const body = `<sub>Identified by Warden skill1 · finding-42</sub>`;

    expect(updateWardenCommentBody(body, 'skill2')).toBe(
      '<sub>Identified by Warden · skill1, skill2 · finding-42</sub>'
    );
  });

  it('returns null when the skill is already present', () => {
    const body = '<sub>Identified by Warden · skill1, skill2 · ABC-123</sub>';
    expect(updateWardenCommentBody(body, 'skill1')).toBeNull();
  });

  it('preserves special characters while safely rewriting the footer', () => {
    const body = '<sub>Identified by Warden · my skill &amp; checks · ABC-123</sub>';

    expect(updateWardenCommentBody(body, 'skill$&$1 <extra>')).toBe(
      '<sub>Identified by Warden · my skill &amp; checks, skill$&amp;$1 &lt;extra&gt; · ABC-123</sub>'
    );
  });

  it('leaves regular comments and unsupported historical footers unchanged', () => {
    expect(updateWardenCommentBody('Regular comment', 'skill1')).toBeNull();
    expect(
      updateWardenCommentBody('<sub>Identified by Warden via `skill1` · high</sub>', 'skill2')
    ).toBeNull();
    expect(
      updateWardenCommentBody('<sub>Identified by Warden [skill1] · ABC-123</sub>', 'skill2')
    ).toBeNull();
  });
});

describe('findingToExistingComment', () => {
  it('converts finding with location to ExistingComment', () => {
    const finding: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: {
        path: 'src/db.ts',
        startLine: 42,
        endLine: 45,
      },
    };

    const comment = findingToExistingComment(finding);
    expect(comment).toEqual({
      id: -1,
      path: 'src/db.ts',
      line: 45,
      title: 'SQL Injection',
      description: 'User input passed to query',
      findingId: 'f1',
      contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
      isWarden: true,
      skills: [],
      severity: 'high',
    });
  });

  it('includes skill when provided', () => {
    const finding: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: {
        path: 'src/db.ts',
        startLine: 42,
      },
    };

    const comment = findingToExistingComment(finding, 'security-review');
    expect(comment).not.toBeNull();
    expect(comment!.isWarden).toBe(true);
    expect(comment!.skills).toEqual(['security-review']);
  });

  it('uses startLine when endLine is not set', () => {
    const finding: Finding = {
      id: 'f1',
      severity: 'medium',
      title: 'Missing Error Handling',
      description: 'No try-catch block',
      location: {
        path: 'src/api.ts',
        startLine: 100,
      },
    };

    const comment = findingToExistingComment(finding);
    expect(comment).not.toBeNull();
    expect(comment!.line).toBe(100);
  });

  it('returns null for finding without location', () => {
    const finding: Finding = {
      id: 'f1',
      severity: 'low',
      title: 'General Issue',
      description: 'Some general finding',
    };

    const comment = findingToExistingComment(finding);
    expect(comment).toBeNull();
  });
});

describe('renderer marker integration', () => {
  it('marker can be parsed after being generated', () => {
    const path = 'src/db.ts';
    const line = 42;
    const hash = generateContentHash('SQL Injection', 'User input passed to query');
    const marker = generateMarker(path, line, hash);

    const body = `**:warning: SQL Injection**

User input passed to query

---
<sub>warden: security-review</sub>
${marker}`;

    const parsed = parseMarker(body);
    expect(parsed).toEqual({ path, line, contentHash: hash });
  });
});

describe('finding metadata', () => {
  it('round-trips finding data from hidden metadata', () => {
    const metadata = generateFindingMetadata({
      id: 'WRZ-XPL',
      severity: 'high',
      confidence: 'medium',
    });
    const body = `**Issue**\n\nDetails\n${metadata}`;

    expect(parseWardenFindingMetadata(body)).toEqual({
      id: 'WRZ-XPL',
      severity: 'high',
      confidence: 'medium',
    });
  });

  it('parses legacy metadata without an ID', () => {
    const metadata = generateFindingMetadata({ severity: 'high', confidence: 'medium' });

    expect(parseWardenFindingMetadata(metadata)).toEqual({
      id: undefined,
      severity: 'high',
      confidence: 'medium',
    });
  });
});

describe('consolidateBatchFindings', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns single finding unchanged', async () => {
    const finding: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/db.ts', startLine: 42 },
    };

    const result = await consolidateBatchFindings([finding]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toBe(finding);
    expect(result.removedCount).toBe(0);
    expect(result.removedFindings).toEqual([]);
  });

  it('returns empty array unchanged', async () => {
    const result = await consolidateBatchFindings([]);
    expect(result.findings).toHaveLength(0);
    expect(result.removedCount).toBe(0);
    expect(result.removedFindings).toEqual([]);
  });

  it('removes exact hash duplicates within batch', async () => {
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/db.ts', startLine: 42 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/db.ts', startLine: 42 },
    };

    const result = await consolidateBatchFindings([finding1, finding2], { hashOnly: true });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toBe(finding1);
    expect(result.removedCount).toBe(1);
    expect(result.removedFindings).toEqual([finding2]);
  });

  it('keeps findings with different hashes at same location in hashOnly mode', async () => {
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'allResolved incorrectly reports true',
      description: 'Resolution API calls may fail',
      location: { path: 'src/workflow.ts', startLine: 438 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'medium',
      title: 'commentsResolvedByStale tracks all stale comments',
      description: 'Not just successfully resolved ones',
      location: { path: 'src/workflow.ts', startLine: 438 },
    };

    const result = await consolidateBatchFindings([finding1, finding2], { hashOnly: true });
    expect(result.findings).toHaveLength(2);
    expect(result.removedCount).toBe(0);
  });

  it('does not group findings more than 5 lines apart', async () => {
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'Bug A',
      description: 'Description A',
      location: { path: 'src/file.ts', startLine: 10 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'high',
      title: 'Bug B',
      description: 'Description B',
      location: { path: 'src/file.ts', startLine: 20 },
    };

    // In hashOnly mode, these should both pass through since they're different hashes
    const result = await consolidateBatchFindings([finding1, finding2], { hashOnly: true });
    expect(result.findings).toHaveLength(2);
    expect(result.removedCount).toBe(0);
  });

  it('does not group findings in different files', async () => {
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'Same Issue',
      description: 'Same description',
      location: { path: 'src/a.ts', startLine: 42 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'high',
      title: 'Same Issue',
      description: 'Same description but different file',
      location: { path: 'src/b.ts', startLine: 42 },
    };

    const result = await consolidateBatchFindings([finding1, finding2], { hashOnly: true });
    expect(result.findings).toHaveLength(2);
    expect(result.removedCount).toBe(0);
  });

  it('skips LLM when no proximity clusters exist', async () => {
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'Bug A',
      description: 'Description A',
      location: { path: 'src/file.ts', startLine: 10 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'medium',
      title: 'Bug B',
      description: 'Description B',
      location: { path: 'src/file.ts', startLine: 100 },
    };

    // Even with an API key, no LLM call should be made since findings are far apart
    const result = await consolidateBatchFindings([finding1, finding2], { apiKey: 'test-key' });
    expect(result.findings).toHaveLength(2);
    expect(result.removedCount).toBe(0);
    expect(result.usage).toBeUndefined();
  });

  it('groups findings within 5 lines of each other for proximity check', async () => {
    // This tests the proximity grouping logic (without LLM since no API key)
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'Bug A at line 10',
      description: 'Issue at line 10',
      location: { path: 'src/file.ts', startLine: 10 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'medium',
      title: 'Bug B at line 13',
      description: 'Issue at line 13',
      location: { path: 'src/file.ts', startLine: 13 },
    };

    // Without API key, LLM phase is skipped, both findings kept
    const result = await consolidateBatchFindings([finding1, finding2]);
    expect(result.findings).toHaveLength(2);
    expect(result.removedCount).toBe(0);
  });

  it('preserves locations from losers via mergeGroup (hash dedup)', async () => {
    // Two exact-duplicate findings at the same location: hash dedup should pick first
    const finding1: Finding = {
      id: 'f1',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/db.ts', startLine: 42 },
    };

    const finding2: Finding = {
      id: 'f2',
      severity: 'high',
      title: 'SQL Injection',
      description: 'User input passed to query',
      location: { path: 'src/db.ts', startLine: 42 },
      additionalLocations: [{ path: 'src/api.ts', startLine: 100 }],
    };

    // Hash dedup removes exact duplicates before LLM phase
    // Since they have the same hash+line, finding2 is dropped
    const result = await consolidateBatchFindings([finding1, finding2], { hashOnly: true });
    expect(result.findings).toHaveLength(1);
    // Hash dedup just drops duplicates (doesn't merge locations)
    // That's expected: mergeGroup is used for LLM-grouped findings
    expect(result.findings[0]).toBe(finding1);
  });
});
