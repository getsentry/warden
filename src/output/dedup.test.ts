import { describe, it, expect } from 'vitest';
import {
  generateContentHash,
  generateMarker,
  parseMarker,
  parseWardenComment,
  isWardenComment,
  deduplicateFindings,
  findingToExistingComment,
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

  it('returns null for non-Warden comment', () => {
    const body = 'This is a regular comment without the expected format.';
    expect(parseWardenComment(body)).toBeNull();
  });
});

describe('isWardenComment', () => {
  it('returns true for comment with attribution', () => {
    const body = `**:warning: Issue**\n\nDescription\n\n---\n<sub>warden: skill</sub>`;
    expect(isWardenComment(body)).toBe(true);
  });

  it('returns true for comment with marker', () => {
    const body = `**Issue**\n\n<!-- warden:v1:file.ts:10:abc12345 -->`;
    expect(isWardenComment(body)).toBe(true);
  });

  it('returns false for regular comment', () => {
    const body = 'This is a regular comment.';
    expect(isWardenComment(body)).toBe(false);
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
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(baseFinding);
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
    expect(result).toHaveLength(0);
  });

  it('filters out exact hash matches', async () => {
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

    const result = await deduplicateFindings([baseFinding], existingComments, { hashOnly: true });
    expect(result).toHaveLength(0);
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
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('XSS Vulnerability');
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
      },
      {
        id: 2,
        path: 'src/utils.ts',
        line: 50,
        title: 'Code Style',
        description: 'Inconsistent indentation',
        contentHash: generateContentHash('Code Style', 'Inconsistent indentation'),
      },
    ];

    const result = await deduplicateFindings([finding1, finding2, finding3], existingComments, {
      hashOnly: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('f2');
  });

  it('works without API key (hash-only mode)', async () => {
    const findings = [baseFinding];
    const existingComments: ExistingComment[] = [];

    const result = await deduplicateFindings(findings, existingComments, {});
    expect(result).toHaveLength(1);
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
      contentHash: generateContentHash('SQL Injection', 'User input passed to query'),
    });
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
