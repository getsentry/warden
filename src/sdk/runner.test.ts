import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractFindingsJson,
  extractBalancedJson,
  extractFindingsWithLLM,
  truncateForLLMFallback,
  buildSystemPrompt,
} from './runner.js';
import type { SkillDefinition } from '../config/schema.js';

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

  it('extracts findings from typescript code block', () => {
    const text = '```typescript\n{"findings": [{"id": "ts-1"}]}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'ts-1' }],
    });
  });

  it('extracts findings from javascript code block', () => {
    const text = '```javascript\n{"findings": []}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({ success: true, findings: [] });
  });

  it('extracts findings from ts code block (short form)', () => {
    const text = '```ts\n{"findings": [{"id": "issue-1"}]}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'issue-1' }],
    });
  });

  it('extracts findings from python code block', () => {
    const text = '```python\n{"findings": [{"id": "py-1"}]}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'py-1' }],
    });
  });

  it('extracts findings from c++ code block', () => {
    const text = '```c++\n{"findings": []}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({ success: true, findings: [] });
  });

  it('extracts findings from c# code block', () => {
    const text = '```c#\n{"findings": [{"id": "cs-1"}]}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'cs-1' }],
    });
  });

  it('extracts findings from objective-c code block', () => {
    const text = '```objective-c\n{"findings": []}\n```';
    const result = extractFindingsJson(text);
    expect(result).toEqual({ success: true, findings: [] });
  });

  it('extracts findings with prose and typescript code block', () => {
    const text = `Here's what I found in this TypeScript code:

\`\`\`typescript
{"findings": [{"id": "type-error", "title": "Missing type annotation"}]}
\`\`\`

Let me know if you need more details.`;
    const result = extractFindingsJson(text);
    expect(result).toEqual({
      success: true,
      findings: [{ id: 'type-error', title: 'Missing type annotation' }],
    });
  });
});

describe('truncateForLLMFallback', () => {
  it('returns text unchanged when under limit', () => {
    const text = 'short text';
    expect(truncateForLLMFallback(text, 100)).toBe(text);
  });

  it('returns text unchanged when exactly at limit', () => {
    const text = 'x'.repeat(100);
    expect(truncateForLLMFallback(text, 100)).toBe(text);
  });

  it('preserves findings section when found in text', () => {
    const prefix = 'Some context before. '.repeat(50);
    const findings = '{"findings": [{"id": "test-1", "title": "Issue"}]}';
    const suffix = ' More text after.'.repeat(10);
    const text = prefix + findings + suffix;

    const result = truncateForLLMFallback(text, 500);

    expect(result).toContain('{"findings"');
    expect(result).toContain('"id": "test-1"');
  });

  it('handles findings at very end of long text', () => {
    const longPrefix = 'context '.repeat(5000);
    const findings = '{"findings": [{"id": "end-finding"}]}';
    const text = longPrefix + findings;

    const result = truncateForLLMFallback(text, 1000);

    // Should preserve the findings section
    expect(result).toContain('{"findings"');
    expect(result).toContain('end-finding');
  });

  it('includes truncation marker when findings section is truncated', () => {
    const longFindings =
      '{"findings": [' + '{"id": "item"},'.repeat(100) + '{"id": "last"}]}';
    const text = 'prefix ' + longFindings;

    const result = truncateForLLMFallback(text, 200);

    expect(result).toContain('{"findings"');
    expect(result).toContain('[... truncated]');
  });
});

describe('extractFindingsWithLLM', () => {
  it('returns error when no API key provided', async () => {
    const result = await extractFindingsWithLLM('{"findings": []}', undefined);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('no_api_key_for_fallback');
    }
  });

  it('returns error with empty API key', async () => {
    const result = await extractFindingsWithLLM('{"findings": []}', '');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('no_api_key_for_fallback');
    }
  });

  it('returns error when no findings pattern exists', async () => {
    const result = await extractFindingsWithLLM('some output without findings', 'fake-key');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('no_findings_to_extract');
    }
  });

  it('allows findings pattern with whitespace after brace', async () => {
    // Should not return no_findings_to_extract error for { "findings"
    const result = await extractFindingsWithLLM('{ "findings": []}', undefined);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should fail for no API key, not for missing pattern
      expect(result.error).toBe('no_api_key_for_fallback');
    }
  });

  it('includes preview in error response', async () => {
    const longText = 'x'.repeat(300);
    const result = await extractFindingsWithLLM(longText, undefined);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.preview).toHaveLength(200);
    }
  });
});

describe('buildSystemPrompt', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const baseSkill: SkillDefinition = {
    name: 'test-skill',
    description: 'A test skill',
    prompt: 'Check for issues',
  };

  it('does not include resource guidance when rootDir is not set', () => {
    const prompt = buildSystemPrompt(baseSkill);
    expect(prompt).not.toContain('<skill_resources>');
    expect(prompt).not.toContain('scripts/');
    expect(prompt).not.toContain('references/');
    expect(prompt).not.toContain('assets/');
  });

  it('does not include resource guidance when rootDir has no resource directories', () => {
    const skill: SkillDefinition = { ...baseSkill, rootDir: tempDir };
    const prompt = buildSystemPrompt(skill);
    expect(prompt).not.toContain('<skill_resources>');
  });

  it('includes resource guidance when scripts/ directory exists', () => {
    mkdirSync(join(tempDir, 'scripts'));
    const skill: SkillDefinition = { ...baseSkill, rootDir: tempDir };
    const prompt = buildSystemPrompt(skill);
    expect(prompt).toContain('<skill_resources>');
    expect(prompt).toContain(`This skill is located at: ${tempDir}`);
    expect(prompt).toContain('scripts/');
    expect(prompt).not.toContain('references/');
    expect(prompt).not.toContain('assets/');
  });

  it('includes resource guidance when references/ directory exists', () => {
    mkdirSync(join(tempDir, 'references'));
    const skill: SkillDefinition = { ...baseSkill, rootDir: tempDir };
    const prompt = buildSystemPrompt(skill);
    expect(prompt).toContain('<skill_resources>');
    expect(prompt).toContain('references/');
  });

  it('includes resource guidance when assets/ directory exists', () => {
    mkdirSync(join(tempDir, 'assets'));
    const skill: SkillDefinition = { ...baseSkill, rootDir: tempDir };
    const prompt = buildSystemPrompt(skill);
    expect(prompt).toContain('<skill_resources>');
    expect(prompt).toContain('assets/');
  });

  it('lists all existing resource directories', () => {
    mkdirSync(join(tempDir, 'scripts'));
    mkdirSync(join(tempDir, 'references'));
    mkdirSync(join(tempDir, 'assets'));
    const skill: SkillDefinition = { ...baseSkill, rootDir: tempDir };
    const prompt = buildSystemPrompt(skill);
    expect(prompt).toContain('<skill_resources>');
    expect(prompt).toContain('scripts/, references/, assets/');
  });

  it('lists only existing directories when some are missing', () => {
    mkdirSync(join(tempDir, 'scripts'));
    mkdirSync(join(tempDir, 'assets'));
    // references/ does not exist
    const skill: SkillDefinition = { ...baseSkill, rootDir: tempDir };
    const prompt = buildSystemPrompt(skill);
    expect(prompt).toContain('scripts/, assets/');
    expect(prompt).not.toContain('references/');
  });
});
