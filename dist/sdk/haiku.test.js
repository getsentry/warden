import { describe, it, expect } from 'vitest';
import { extractJson } from './haiku.js';
describe('extractJson', () => {
    it('extracts a simple JSON object', () => {
        expect(extractJson('{"status": "resolved", "reasoning": "Fixed"}')).toBe('{"status": "resolved", "reasoning": "Fixed"}');
    });
    it('extracts JSON from surrounding prose', () => {
        const text = 'Here is my analysis:\n{"status": "not_attempted", "reasoning": "No changes"}\nDone.';
        expect(extractJson(text)).toBe('{"status": "not_attempted", "reasoning": "No changes"}');
    });
    it('extracts JSON from markdown code fences', () => {
        const text = '```json\n{"status": "resolved", "reasoning": "Fixed the bug"}\n```';
        expect(extractJson(text)).toBe('{"status": "resolved", "reasoning": "Fixed the bug"}');
    });
    it('extracts JSON array', () => {
        const text = 'Results: [{"findingIndex": 1, "existingIndex": 2}]';
        expect(extractJson(text)).toBe('[{"findingIndex": 1, "existingIndex": 2}]');
    });
    it('extracts empty JSON array', () => {
        expect(extractJson('[]')).toBe('[]');
    });
    it('handles nested objects', () => {
        const text = '{"outer": {"inner": {"deep": true}}, "status": "ok"}';
        expect(extractJson(text)).toBe('{"outer": {"inner": {"deep": true}}, "status": "ok"}');
    });
    it('returns null when no JSON found', () => {
        expect(extractJson('This is just plain text with no JSON')).toBeNull();
    });
    it('returns null for empty string', () => {
        expect(extractJson('')).toBeNull();
    });
    it('handles prefilled JSON (starts with {)', () => {
        const text = '{"status": "resolved", "reasoning": "The fix was applied correctly"}';
        expect(extractJson(text)).toBe(text);
    });
    it('handles prefilled JSON (starts with [)', () => {
        const text = '[{"findingIndex": 1, "existingIndex": 1}]';
        expect(extractJson(text)).toBe(text);
    });
    it('handles code fence with language tag', () => {
        const text = '```typescript\n{"value": 42}\n```';
        expect(extractJson(text)).toBe('{"value": 42}');
    });
    it('handles JSON with escaped quotes in strings', () => {
        const text = '{"reasoning": "The \\"fix\\" was incomplete"}';
        expect(extractJson(text)).toBe('{"reasoning": "The \\"fix\\" was incomplete"}');
    });
    it('chooses first valid JSON when multiple closers exist', () => {
        // The function scans for the first valid JSON from the first { or [
        const text = '{"a": 1} extra text {"b": 2}';
        expect(extractJson(text)).toBe('{"a": 1}');
    });
});
//# sourceMappingURL=haiku.test.js.map