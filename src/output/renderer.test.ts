import { describe, it, expect } from 'vitest';
import { renderSkillReport } from './renderer.js';
import { parseMarker } from './dedup.js';
import type { SkillReport } from '../types/index.js';

describe('renderSkillReport', () => {
  const baseReport: SkillReport = {
    skill: 'security-review',
    summary: 'Found 2 potential issues',
    findings: [],
  };

  it('renders empty findings report', () => {
    const result = renderSkillReport(baseReport);

    expect(result.review).toBeUndefined();
    expect(result.summaryComment).toContain('security-review');
    expect(result.summaryComment).toContain('No findings to report');
  });

  it('renders findings with inline comments', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'sql-injection-1',
          severity: 'critical',
          title: 'SQL Injection',
          description: 'User input passed directly to query',
          location: {
            path: 'src/db.ts',
            startLine: 42,
            endLine: 45,
          },
        },
      ],
    };

    const result = renderSkillReport(report);

    expect(result.review).toBeDefined();
    const review = result.review!;
    expect(review.event).toBe('REQUEST_CHANGES');
    expect(review.comments).toHaveLength(1);
    expect(review.comments[0]!.path).toBe('src/db.ts');
    expect(review.comments[0]!.line).toBe(45);
    expect(review.comments[0]!.body).toContain('SQL Injection');
  });

  it('includes skill attribution footnote in comments', () => {
    const report: SkillReport = {
      ...baseReport,
      skill: 'code-review',
      findings: [
        {
          id: 'f1',
          severity: 'medium',
          title: 'Issue',
          description: 'Details',
          location: {
            path: 'src/file.ts',
            startLine: 10,
          },
        },
      ],
    };

    const result = renderSkillReport(report);

    expect(result.review).toBeDefined();
    expect(result.review!.comments[0]!.body).toContain('<sub>warden: code-review</sub>');
  });

  it('includes deduplication marker in comments', () => {
    const report: SkillReport = {
      ...baseReport,
      skill: 'security-review',
      findings: [
        {
          id: 'f1',
          severity: 'high',
          title: 'SQL Injection',
          description: 'User input passed to query',
          location: {
            path: 'src/db.ts',
            startLine: 42,
          },
        },
      ],
    };

    const result = renderSkillReport(report);

    expect(result.review).toBeDefined();
    const body = result.review!.comments[0]!.body;

    // Verify marker is present and parseable
    const marker = parseMarker(body);
    expect(marker).not.toBeNull();
    expect(marker!.path).toBe('src/db.ts');
    expect(marker!.line).toBe(42);
    expect(marker!.contentHash).toMatch(/^[a-f0-9]{8}$/);
  });

  it('sets start_line for multi-line findings', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'multi-line-1',
          severity: 'medium',
          title: 'Multi-line issue',
          description: 'Spans multiple lines',
          location: {
            path: 'src/code.ts',
            startLine: 10,
            endLine: 15,
          },
        },
      ],
    };

    const result = renderSkillReport(report);

    const comment = result.review!.comments[0]!;
    expect(comment.line).toBe(15);
    expect(comment.start_line).toBe(10);
    expect(comment.start_side).toBe('RIGHT');
  });

  it('does not set start_line for single-line findings', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'single-line-1',
          severity: 'medium',
          title: 'Single-line issue',
          description: 'On one line',
          location: {
            path: 'src/code.ts',
            startLine: 25,
          },
        },
      ],
    };

    const result = renderSkillReport(report);

    const comment = result.review!.comments[0]!;
    expect(comment.line).toBe(25);
    expect(comment.start_line).toBeUndefined();
    expect(comment.start_side).toBeUndefined();
  });

  it('does not set start_line when startLine equals endLine', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'same-line-1',
          severity: 'medium',
          title: 'Same line issue',
          description: 'Start and end are same',
          location: {
            path: 'src/code.ts',
            startLine: 30,
            endLine: 30,
          },
        },
      ],
    };

    const result = renderSkillReport(report);

    const comment = result.review!.comments[0]!;
    expect(comment.line).toBe(30);
    expect(comment.start_line).toBeUndefined();
    expect(comment.start_side).toBeUndefined();
  });

  it('renders suggested fixes as GitHub suggestions', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'fix-1',
          severity: 'medium',
          title: 'Use parameterized query',
          description: 'Replace string concatenation with parameters',
          location: {
            path: 'src/db.ts',
            startLine: 10,
          },
          suggestedFix: {
            description: 'Use prepared statement',
            diff: `--- a/src/db.ts
+++ b/src/db.ts
@@ -10,1 +10,1 @@
-const query = "SELECT * FROM users WHERE id = " + id;
+const query = "SELECT * FROM users WHERE id = ?";`,
          },
        },
      ],
    };

    const result = renderSkillReport(report);

    const review = result.review!;
    expect(review.comments[0]!.body).toContain('```suggestion');
    expect(review.comments[0]!.body).toContain(
      'const query = "SELECT * FROM users WHERE id = ?";'
    );
  });

  it('groups findings by file in summary', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'f1',
          severity: 'medium',
          title: 'Issue A',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 10 },
        },
        {
          id: 'f2',
          severity: 'low',
          title: 'Issue B',
          description: 'Details',
          location: { path: 'src/b.ts', startLine: 20 },
        },
        {
          id: 'f3',
          severity: 'info',
          title: 'Issue C',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 30 },
        },
      ],
    };

    const result = renderSkillReport(report);

    expect(result.summaryComment).toContain('`src/a.ts`');
    expect(result.summaryComment).toContain('`src/b.ts`');
  });

  it('sorts findings by severity', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'f1',
          severity: 'low',
          title: 'Low Issue',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 10 },
        },
        {
          id: 'f2',
          severity: 'critical',
          title: 'Critical Issue',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 20 },
        },
      ],
    };

    const result = renderSkillReport(report);

    const review = result.review!;
    expect(review.comments[0]!.body).toContain('Critical Issue');
  });

  it('requests changes for critical/high severity', () => {
    const criticalReport: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'f1',
          severity: 'critical',
          title: 'Critical',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 1 },
        },
      ],
    };

    const highReport: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'f1',
          severity: 'high',
          title: 'High',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 1 },
        },
      ],
    };

    const mediumReport: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'f1',
          severity: 'medium',
          title: 'Medium',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 1 },
        },
      ],
    };

    const criticalResult = renderSkillReport(criticalReport);
    const highResult = renderSkillReport(highReport);
    const mediumResult = renderSkillReport(mediumReport);
    expect(criticalResult.review!.event).toBe('REQUEST_CHANGES');
    expect(highResult.review!.event).toBe('REQUEST_CHANGES');
    expect(mediumResult.review!.event).toBe('COMMENT');
  });

  it('respects maxFindings option', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: Array.from({ length: 10 }, (_, i) => ({
        id: `f${i}`,
        severity: 'info' as const,
        title: `Finding ${i}`,
        description: 'Details',
        location: { path: 'src/a.ts', startLine: i + 1 },
      })),
    };

    const result = renderSkillReport(report, { maxFindings: 3 });

    expect(result.review!.comments).toHaveLength(3);
  });

  it('handles findings without location', () => {
    const report: SkillReport = {
      ...baseReport,
      findings: [
        {
          id: 'f1',
          severity: 'medium',
          title: 'General Issue',
          description: 'Applies to whole project',
        },
      ],
    };

    const result = renderSkillReport(report);

    expect(result.review).toBeUndefined();
    expect(result.summaryComment).toContain('General Issue');
    expect(result.summaryComment).toContain('General');
  });

  describe('commentOn filtering', () => {
    it('filters findings by commentOn threshold', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Critical details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
          {
            id: 'f2',
            severity: 'high',
            title: 'High Issue',
            description: 'High details',
            location: { path: 'src/a.ts', startLine: 20 },
          },
          {
            id: 'f3',
            severity: 'medium',
            title: 'Medium Issue',
            description: 'Medium details',
            location: { path: 'src/a.ts', startLine: 30 },
          },
          {
            id: 'f4',
            severity: 'low',
            title: 'Low Issue',
            description: 'Low details',
            location: { path: 'src/a.ts', startLine: 40 },
          },
        ],
      };

      // commentOn='high' should only include critical and high
      const result = renderSkillReport(report, { commentOn: 'high' });

      expect(result.review).toBeDefined();
      expect(result.review!.comments).toHaveLength(2);
      expect(result.review!.comments.map((c) => c.body)).toEqual([
        expect.stringContaining('Critical Issue'),
        expect.stringContaining('High Issue'),
      ]);
    });

    it('shows all findings when commentOn is not specified', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
          {
            id: 'f2',
            severity: 'info',
            title: 'Info Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 20 },
          },
        ],
      };

      const result = renderSkillReport(report);

      expect(result.review!.comments).toHaveLength(2);
    });

    it('returns empty review when all findings are filtered out', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'low',
            title: 'Low Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
          {
            id: 'f2',
            severity: 'info',
            title: 'Info Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 20 },
          },
        ],
      };

      const result = renderSkillReport(report, { commentOn: 'high' });

      expect(result.review).toBeUndefined();
      expect(result.summaryComment).toContain('No findings to report');
    });

    it('applies commentOn filter before maxFindings limit', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
          {
            id: 'f2',
            severity: 'low',
            title: 'Low Issue 1',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 20 },
          },
          {
            id: 'f3',
            severity: 'low',
            title: 'Low Issue 2',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 30 },
          },
        ],
      };

      // With commentOn='high' and maxFindings=2, should only show critical (1 finding)
      // because low findings are filtered out first
      const result = renderSkillReport(report, { commentOn: 'high', maxFindings: 2 });

      expect(result.review!.comments).toHaveLength(1);
      expect(result.review!.comments[0]!.body).toContain('Critical Issue');
    });
  });

  describe('stats footer', () => {
    it('includes stats footer in summary comment when stats are available', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'medium',
            title: 'Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
        durationMs: 15800,
        usage: {
          inputTokens: 3000,
          outputTokens: 680,
          costUSD: 0.0048,
        },
      };

      const result = renderSkillReport(report);

      expect(result.summaryComment).toContain('⏱ 15.8s');
      expect(result.summaryComment).toContain('3.0k in / 680 out');
      expect(result.summaryComment).toContain('$0.0048');
      expect(result.summaryComment).toContain('<sub>');
    });

    it('review body is empty (stats only in summary comment)', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'medium',
            title: 'Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
        durationMs: 12300,
        usage: {
          inputTokens: 2500,
          outputTokens: 450,
          costUSD: 0.0032,
        },
      };

      const result = renderSkillReport(report);

      expect(result.review).toBeDefined();
      expect(result.review!.body).toBe('');
    });

    it('includes stats footer in empty findings report', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [],
        durationMs: 8200,
        usage: {
          inputTokens: 1800,
          outputTokens: 320,
          costUSD: 0.0021,
        },
      };

      const result = renderSkillReport(report);

      expect(result.summaryComment).toContain('No findings to report');
      expect(result.summaryComment).toContain('⏱ 8.2s');
      expect(result.summaryComment).toContain('1.8k in / 320 out');
      expect(result.summaryComment).toContain('$0.0021');
    });

    it('omits stats footer when no stats available', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [],
      };

      const result = renderSkillReport(report);

      expect(result.summaryComment).not.toContain('⏱');
      expect(result.summaryComment).not.toContain('<sub>');
    });
  });

  describe('check run link', () => {
    it('shows link to full report when findings are filtered out', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
          {
            id: 'f2',
            severity: 'low',
            title: 'Low Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 20 },
          },
          {
            id: 'f3',
            severity: 'info',
            title: 'Info Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 30 },
          },
        ],
      };

      const result = renderSkillReport(report, {
        commentOn: 'high',
        checkRunUrl: 'https://github.com/owner/repo/runs/123',
        totalFindings: 3,
      });

      expect(result.summaryComment).toContain('View 2 additional findings in Checks');
      expect(result.summaryComment).toContain('https://github.com/owner/repo/runs/123');
    });

    it('shows singular "finding" when only one is hidden', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
          {
            id: 'f2',
            severity: 'low',
            title: 'Low Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 20 },
          },
        ],
      };

      const result = renderSkillReport(report, {
        commentOn: 'high',
        checkRunUrl: 'https://github.com/owner/repo/runs/123',
        totalFindings: 2,
      });

      expect(result.summaryComment).toContain('View 1 additional finding in Checks');
    });

    it('shows link when all findings filtered out', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'low',
            title: 'Low Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
      };

      const result = renderSkillReport(report, {
        commentOn: 'high',
        checkRunUrl: 'https://github.com/owner/repo/runs/123',
        totalFindings: 1,
      });

      expect(result.summaryComment).toContain('No findings to report');
      expect(result.summaryComment).toContain('View 1 additional finding in Checks');
    });

    it('does not show link when no checkRunUrl provided', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
      };

      const result = renderSkillReport(report, {
        commentOn: 'high',
        totalFindings: 3,
      });

      expect(result.summaryComment).not.toContain('View');
      expect(result.summaryComment).not.toContain('additional finding');
    });

    it('does not show link when no findings are hidden', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
      };

      const result = renderSkillReport(report, {
        commentOn: 'high',
        checkRunUrl: 'https://github.com/owner/repo/runs/123',
        totalFindings: 1,
      });

      expect(result.summaryComment).not.toContain('View');
      expect(result.summaryComment).not.toContain('additional finding');
    });
  });
});
