import { describe, it, expect, beforeAll } from 'vitest';
import { discoverExamples, loadExample, getExampleFiles } from './index.js';
import { runSkill } from '../sdk/runner.js';
import { buildFileEventContext } from '../cli/context.js';
import { resolveSkillAsync } from '../skills/loader.js';

describe('examples', () => {
  const apiKey = process.env['WARDEN_ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_API_KEY'];

  beforeAll(() => {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY (or WARDEN_ANTHROPIC_API_KEY) required for integration tests');
    }
  });

  const examples = discoverExamples();

  if (examples.length === 0) {
    it.skip('no examples found', () => {
      // Placeholder for when no examples exist
    });
  }

  for (const exampleDir of examples) {
    const meta = loadExample(exampleDir);
    // Create a readable name from the path (e.g., "security-review/sql-injection")
    const name = exampleDir.split('/').slice(-2).join('/');

    it(`${name}: ${meta.description}`, { timeout: 60000 }, async () => {
        const files = getExampleFiles(exampleDir);
        const context = await buildFileEventContext({
          patterns: files,
          cwd: exampleDir,
        });

        const skill = await resolveSkillAsync(meta.skill);
        const report = await runSkill(skill, context, { apiKey });

        // Validate each expected finding
        for (const expected of meta.expected) {
          const pattern = new RegExp(expected.pattern, 'i');
          const found = report.findings.some((f) => {
            // Check severity matches
            if (f.severity !== expected.severity) return false;

            // Check pattern matches title or description
            const text = `${f.title} ${f.description}`;
            if (!pattern.test(text)) return false;

            // If file specified, check location matches
            if (expected.file && f.location) {
              if (!f.location.path.endsWith(expected.file)) return false;
            }

            return true;
          });

          expect(
            found,
            `Expected ${expected.severity} finding matching "${expected.pattern}"${expected.file ? ` in ${expected.file}` : ''}. ` +
              `Got ${report.findings.length} findings: ${report.findings.map((f) => `[${f.severity}] ${f.title}`).join(', ') || 'none'}`
          ).toBe(true);
        }
    }); // LLM calls can be slow
  }
});
