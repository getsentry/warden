import { describe, it, expect } from 'vitest';
import {
  generateContentHash,
  generateMarker,
  parseMarker,
  parseWardenComment,
  isWardenComment,
  deduplicateFindings,
  findingToExistingComment,
  parseWardenSkills,
  updateWardenCommentBody,
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
      },
    ];

    const result = await deduplicateFindings([baseFinding], existingComments, { hashOnly: true });
    expect(result.newFindings).toHaveLength(0);
    expect(result.duplicateActions).toHaveLength(1);
    expect(result.duplicateActions[0]!.type).toBe('update_warden');
    expect(result.duplicateActions[0]!.matchType).toBe('hash');
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
});

describe('parseWardenSkills', () => {
  it('parses single skill', () => {
    const body = `**:warning: Issue**\n\nDescription\n\n---\n<sub>warden: security-review</sub>`;
    expect(parseWardenSkills(body)).toEqual(['security-review']);
  });

  it('parses multiple skills', () => {
    const body = `**:warning: Issue**\n\nDescription\n\n---\n<sub>warden: security-review, code-quality, performance</sub>`;
    expect(parseWardenSkills(body)).toEqual(['security-review', 'code-quality', 'performance']);
  });

  it('handles extra whitespace', () => {
    const body = `<sub>warden:  skill1 ,  skill2 </sub>`;
    expect(parseWardenSkills(body)).toEqual(['skill1', 'skill2']);
  });

  it('returns empty array for non-Warden comment', () => {
    const body = 'Regular comment without attribution';
    expect(parseWardenSkills(body)).toEqual([]);
  });
});

describe('updateWardenCommentBody', () => {
  it('adds new skill to attribution', () => {
    const body = `**:warning: Issue**\n\nDescription\n\n---\n<sub>warden: skill1</sub>`;
    const result = updateWardenCommentBody(body, 'skill2');
    expect(result).toContain('<sub>warden: skill1, skill2</sub>');
  });

  it('returns null if skill already listed', () => {
    const body = `<sub>warden: skill1, skill2</sub>`;
    const result = updateWardenCommentBody(body, 'skill1');
    expect(result).toBeNull();
  });

  it('preserves rest of comment body', () => {
    const body = `**:warning: SQL Injection**\n\nUser input passed to query\n\n---\n<sub>warden: security-review</sub>\n<!-- warden:v1:file.ts:10:abc123 -->`;
    const result = updateWardenCommentBody(body, 'code-quality');
    expect(result).toContain('**:warning: SQL Injection**');
    expect(result).toContain('User input passed to query');
    expect(result).toContain('<sub>warden: security-review, code-quality</sub>');
    expect(result).toContain('<!-- warden:v1:file.ts:10:abc123 -->');
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
      isWarden: true,
      skills: [],
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
