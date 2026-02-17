import { describe, it, expect, beforeAll } from 'vitest';
import { discoverEvals } from './index.js';
import { runEval } from './runner.js';
import { formatEvalResult } from './types.js';

describe('evals', () => {
  const apiKey = process.env['WARDEN_ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_API_KEY'];

  beforeAll(() => {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY (or WARDEN_ANTHROPIC_API_KEY) required for evals');
    }
  });

  const evals = discoverEvals();

  if (evals.length === 0) {
    it.skip('no evals found', () => {
      // Placeholder when no eval scenarios exist
    });
  }

  for (const meta of evals) {
    it(
      `${meta.category}/${meta.name}: ${meta.given}`,
      { timeout: 120_000 },
      async () => {
        const result = await runEval(meta, {
          apiKey: apiKey!,
          verbose: true,
        });

        // Log the formatted result for visibility
        console.log('\n' + formatEvalResult(result));
        console.log(`  Duration: ${result.durationMs}ms`);
        console.log(`  Findings: ${result.report.findings.length}`);

        // Log each finding for debugging
        for (const finding of result.report.findings) {
          const loc = finding.location
            ? ` (${finding.location.path}:${finding.location.startLine})`
            : '';
          console.log(`    [${finding.severity}] ${finding.title}${loc}`);
        }

        expect(result.passed, formatEvalResult(result)).toBe(true);
      },
    );
  }
});
