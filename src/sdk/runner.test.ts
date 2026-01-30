import { describe, it, expect } from 'vitest';
import { extractFindingsJson, extractBalancedJson } from './runner.js';

describe('extractBalancedJson', () => {
  it('extracts simple JSON object', () => {
    const text = '{"key": "value"}';
    expect(extractBalancedJson(text, 0)).toBe('{"key": "value"}');
  });

  it('extracts nested JSON object', () => {
    const text = '{"outer": {"inner": "value"}}';
    expect(extractBalancedJson(text, 0)).toBe('{"outer": {"inner": "value"}}');
  });

  it('extracts JSON with nested arrays', () => {
    const text = '{"items": [{"id": 1}, {"id": 2}]}';
    expect(extractBalancedJson(text, 0)).toBe('{"items": [{"id": 1}, {"id": 2}]}');
  });

  it('handles strings containing braces', () => {
    const text = '{"code": "function() { return {}; }"}';
    expect(extractBalancedJson(text, 0)).toBe('{"code": "function() { return {}; }"}');
  });

  it('handles escaped quotes in strings', () => {
    const text = '{"text": "He said \\"hello\\""}';
    expect(extractBalancedJson(text, 0)).toBe('{"text": "He said \\"hello\\""}');
  });

  it('handles escaped backslashes', () => {
    const text = '{"path": "C:\\\\Users\\\\test"}';
    expect(extractBalancedJson(text, 0)).toBe('{"path": "C:\\\\Users\\\\test"}');
  });

  it('extracts JSON starting at offset', () => {
    const text = 'Some text before {"key": "value"} and after';
    expect(extractBalancedJson(text, 17)).toBe('{"key": "value"}');
  });

  it('returns null for unbalanced JSON', () => {
    const text = '{"key": "value"';
    expect(extractBalancedJson(text, 0)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(extractBalancedJson('', 0)).toBeNull();
  });
});

describe('extractFindingsJson', () => {
  it('extracts simple findings JSON', () => {
    const text = '{"findings": []}';
    const result = extractFindingsJson(text);
    expect(result).toEqual({ success: true, findings: [] });
  });

  it('extracts findings with items', () => {
    const text = '{"findings": [{"id": "test-1", "title": "Test"}]}';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'test-1', title: 'Test' }],
    });
  });

  it('extracts findings from markdown code block', () => {
    const text = '```json\n{"findings": [{"id": "test-1"}]}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'test-1' }],
    });
  });

  it('extracts findings from code block without json tag', () => {
    const text = '```\n{"findings": []}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({ success: true, findings: [] });
  });

  it('extracts findings with prose before JSON', () => {
    const text = 'Based on my analysis, here are the findings:\n\n{"findings": [{"id": "bug-1"}]}';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'bug-1' }],
    });
  });

  it('extracts findings with prose and markdown code block', () => {
    const text = `Based on my analysis of this code change, I can provide my findings:

\`\`\`json
{"findings": [{"id": "issue-1", "title": "Missing null check"}]}
\`\`\``;
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'issue-1', title: 'Missing null check' }],
    });
  });

  it('handles findings with nested arrays (tags, etc)', () => {
    const text = '{"findings": [{"id": "test", "tags": ["security", "critical"]}]}';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'test', tags: ['security', 'critical'] }],
    });
  });

  it('handles findings with nested objects', () => {
    const text = '{"findings": [{"id": "test", "location": {"path": "file.ts", "lines": {"start": 1, "end": 10}}}]}';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [
        {
          id: 'test',
          location: { path: 'file.ts', lines: { start: 1, end: 10 } },
        },
      ],
    });
  });

  it('handles complex nested structure', () => {
    const text = `{"findings": [
      {
        "id": "sql-injection",
        "title": "SQL Injection",
        "severity": "critical",
        "location": {
          "path": "src/db.ts",
          "lines": {"start": 42, "end": 45}
        },
        "tags": ["security", "owasp-top-10"],
        "suggestedFix": {
          "description": "Use parameterized queries",
          "diff": "--- a/src/db.ts\\n+++ b/src/db.ts"
        }
      }
    ]}`;
    const result = extractFindingsJson(text);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]).toMatchObject({
        id: 'sql-injection',
        severity: 'critical',
      });
    }
  });

  it('returns error for missing findings JSON', () => {
    const text = 'No JSON here, just plain text analysis.';
    const result = extractFindingsJson(text);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('no_findings_json');
    }
  });

  it('returns error for unbalanced JSON', () => {
    const text = '{"findings": [{"id": "test"';
    const result = extractFindingsJson(text);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('unbalanced_json');
    }
  });

  it('returns error for invalid JSON syntax', () => {
    const text = '{"findings": [invalid json]}';
    const result = extractFindingsJson(text);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('invalid_json');
    }
  });

  it('returns error when findings key is missing', () => {
    const text = '{"results": []}';
    const result = extractFindingsJson(text);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('no_findings_json');
    }
  });

  it('returns error when findings is not an array', () => {
    const text = '{"findings": "not an array"}';
    const result = extractFindingsJson(text);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('findings_not_array');
    }
  });

  it('handles whitespace around JSON', () => {
    const text = '   \n\n  {"findings": []}  \n\n  ';
    const result = extractFindingsJson(text);
    expect(result).toEqual({ success: true, findings: [] });
  });

  it('handles pretty-printed JSON with whitespace after opening brace', () => {
    const text = `{
  "findings": [
    {
      "id": "test-1",
      "title": "Test Finding"
    }
  ]
}`;
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'test-1', title: 'Test Finding' }],
    });
  });

  it('handles JSON with trailing content', () => {
    const text = '{"findings": []} Some trailing text here';
    const result = extractFindingsJson(text);
    expect(result).toEqual({ success: true, findings: [] });
  });
});
