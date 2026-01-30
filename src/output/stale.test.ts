import { describe, it, expect } from 'vitest';
import { buildAnalyzedScope, isInAnalyzedScope, findStaleComments } from './stale.js';
import { generateContentHash } from './dedup.js';
import type { ExistingComment } from './dedup.js';
import type { Finding, FileChange } from '../types/index.js';

describe('buildAnalyzedScope', () => {
  it('creates scope from file changes', () => {
    const files: FileChange[] = [
      { filename: 'src/db.ts', status: 'modified', additions: 10, deletions: 5 },
      { filename: 'src/api.ts', status: 'added', additions: 50, deletions: 0 },
    ];

    const scope = buildAnalyzedScope(files);
    expect(scope.files.has('src/db.ts')).toBe(true);
    expect(scope.files.has('src/api.ts')).toBe(true);
    expect(scope.files.has('src/other.ts')).toBe(false);
  });

  it('handles empty file list', () => {
    const scope = buildAnalyzedScope([]);
    expect(scope.files.size).toBe(0);
  });
});

describe('isInAnalyzedScope', () => {
  const scope = buildAnalyzedScope([
    { filename: 'src/db.ts', status: 'modified', additions: 10, deletions: 5 },
    { filename: 'src/api.ts', status: 'added', additions: 50, deletions: 0 },
  ]);

  it('returns true for comment on analyzed file', () => {
    const comment: ExistingComment = {
      id: 1,
      path: 'src/db.ts',
      line: 42,
      title: 'SQL Injection',
      description: 'User input passed to query',
      contentHash: 'abc12345',
      threadId: 'thread-1',
    };

    expect(isInAnalyzedScope(comment, scope)).toBe(true);
  });

  it('returns false for comment on non-analyzed file', () => {
    const comment: ExistingComment = {
      id: 2,
      path: 'src/other.ts',
      line: 100,
      title: 'Some Issue',
      description: 'Description',
      contentHash: 'def67890',
      threadId: 'thread-2',
    };

    expect(isInAnalyzedScope(comment, scope)).toBe(false);
  });
});

describe('findStaleComments', () => {
  const scope = buildAnalyzedScope([
    { filename: 'src/db.ts', status: 'modified', additions: 10, deletions: 5 },
    { filename: 'src/api.ts', status: 'added', additions: 50, deletions: 0 },
  ]);

  it('returns empty array when no existing comments', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input passed to query',
        location: { path: 'src/db.ts', startLine: 42 },
      },
    ];

    const stale = findStaleComments([], findings, scope);
    expect(stale).toHaveLength(0);
  });

  it('returns empty array when all comments have matching findings', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
    ];

    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input passed to query',
        location: { path: 'src/db.ts', startLine: 42 },
      },
    ];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(0);
  });

  it('identifies stale comment when finding is removed', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
    ];

    // No matching findings - the issue was fixed
    const findings: Finding[] = [];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(1);
    expect(stale[0]!.id).toBe(1);
  });

  it('skips comments without threadId', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        // No threadId
      },
    ];

    const findings: Finding[] = [];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(0);
  });

  it('skips already-resolved comments', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
        isResolved: true, // Already resolved by user
      },
    ];

    const findings: Finding[] = [];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(0);
  });

  it('marks comments on files not in analyzed scope as orphaned', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/other.ts', // Not in scope - orphaned (file renamed, reverted, etc.)
        line: 42,
        title: 'Some Issue',
        description: 'Description',
        contentHash: 'abc12345',
        threadId: 'thread-1',
      },
    ];

    const findings: Finding[] = [];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(1);
    expect(stale[0]!.id).toBe(1);
  });

  it('matches findings within 5 lines of comment', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
    ];

    // Finding at line 45 (3 lines away) - should still match
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input passed to query',
        location: { path: 'src/db.ts', startLine: 45 },
      },
    ];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(0);
  });

  it('does not match findings more than 5 lines away', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
    ];

    // Finding at line 50 (8 lines away) - should not match
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input passed to query',
        location: { path: 'src/db.ts', startLine: 50 },
      },
    ];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(1);
  });

  it('matches by title when content hash differs slightly', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
    ];

    // Same title but slightly different description
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input is passed directly to the database query',
        location: { path: 'src/db.ts', startLine: 42 },
      },
    ];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(0);
  });

  it('handles multiple comments and findings correctly', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
      {
        id: 2,
        path: 'src/api.ts',
        line: 100,
        title: 'Missing Error Handling',
        description: 'No try-catch block',
        contentHash: generateContentHash('Missing Error Handling', 'No try-catch block'),
        threadId: 'thread-2',
      },
      {
        id: 3,
        path: 'src/db.ts',
        line: 80,
        title: 'XSS Vulnerability',
        description: 'Unescaped output',
        contentHash: generateContentHash('XSS Vulnerability', 'Unescaped output'),
        threadId: 'thread-3',
      },
    ];

    // Only SQL Injection still exists, others were fixed
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input passed to query',
        location: { path: 'src/db.ts', startLine: 42 },
      },
    ];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(2);
    expect(stale.map((c) => c.id).sort()).toEqual([2, 3]);
  });

  it('does not match findings in different files', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
    ];

    // Same issue but in different file
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input passed to query',
        location: { path: 'src/api.ts', startLine: 42 },
      },
    ];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(1);
  });

  it('does not match findings without location', () => {
    const comments: ExistingComment[] = [
      {
        id: 1,
        path: 'src/db.ts',
        line: 42,
        title: 'SQL Injection',
        description: 'User input passed to query',
        contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
        threadId: 'thread-1',
      },
    ];

    // Finding without location
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'SQL Injection',
        description: 'User input passed to query',
        // No location
      },
    ];

    const stale = findStaleComments(comments, findings, scope);
    expect(stale).toHaveLength(1);
  });
});
