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
    // Without failOn set, event is COMMENT regardless of severity
    expect(review.event).toBe('COMMENT');
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
    expect(result.review!.comments[0]!.body).toContain('<sub>Identified by Warden via `code-review` · medium</sub>');
  });

  it('includes confidence in attribution footnote when present', () => {
    const report: SkillReport = {
      ...baseReport,
      skill: 'security-review',
      findings: [
        {
          id: 'f1',
          severity: 'high',
          confidence: 'high',
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
    expect(result.review!.comments[0]!.body).toContain(
      '<sub>Identified by Warden via `security-review` · high, high confidence</sub>'
    );
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

  it('uses COMMENT event when failOn is not specified', () => {
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

    // Without failOn, even critical findings use COMMENT
    const result = renderSkillReport(criticalReport);
    expect(result.review!.event).toBe('COMMENT');
  });

  describe('failOn threshold', () => {
    it('uses COMMENT when failOn is not set', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      const result = renderSkillReport(report);
      expect(result.review!.event).toBe('COMMENT');
    });

    it('uses COMMENT when failOn is off', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      const result = renderSkillReport(report, { failOn: 'off' });
      expect(result.review!.event).toBe('COMMENT');
    });

    it('uses REQUEST_CHANGES when failOn is critical and finding is critical', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      const result = renderSkillReport(report, { failOn: 'critical' });
      expect(result.review!.event).toBe('REQUEST_CHANGES');
    });

    it('uses COMMENT when failOn is critical but finding is only high', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      const result = renderSkillReport(report, { failOn: 'critical' });
      expect(result.review!.event).toBe('COMMENT');
    });

    it('uses REQUEST_CHANGES when failOn is high and finding is high', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      const result = renderSkillReport(report, { failOn: 'high' });
      expect(result.review!.event).toBe('REQUEST_CHANGES');
    });

    it('uses REQUEST_CHANGES when failOn is high and finding is critical (more severe)', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      const result = renderSkillReport(report, { failOn: 'high' });
      expect(result.review!.event).toBe('REQUEST_CHANGES');
    });

    it('uses COMMENT when failOn is high but finding is only medium', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'medium',
            title: 'Medium Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      const result = renderSkillReport(report, { failOn: 'high' });
      expect(result.review!.event).toBe('COMMENT');
    });

    it('uses REQUEST_CHANGES when any finding meets failOn threshold', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'low',
            title: 'Low Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
          {
            id: 'f2',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
      };

      const result = renderSkillReport(report, { failOn: 'high' });
      expect(result.review!.event).toBe('REQUEST_CHANGES');
    });

    it('failOn and reportOn work independently', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
          {
            id: 'f2',
            severity: 'low',
            title: 'Low Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
      };

      // reportOn=high filters out low finding from comments
      // failOn=critical causes REQUEST_CHANGES because of critical finding
      const result = renderSkillReport(report, { failOn: 'critical', reportOn: 'high' });
      expect(result.review!.event).toBe('REQUEST_CHANGES');
      expect(result.review!.comments).toHaveLength(1);
      expect(result.review!.comments[0]!.body).toContain('Critical Issue');
    });

    it('REQUEST_CHANGES when reportOn is more restrictive than failOn', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      // reportOn=critical filters out high finding from comments (no comments posted)
      // failOn=high should still cause REQUEST_CHANGES because high finding meets threshold
      // Per spec: "a finding can block the PR but be filtered from comments"
      const result = renderSkillReport(report, { failOn: 'high', reportOn: 'critical' });
      expect(result.review).toBeDefined();
      expect(result.review!.event).toBe('REQUEST_CHANGES');
      expect(result.review!.comments).toHaveLength(0);
      // GitHub API requires non-empty body for REQUEST_CHANGES
      expect(result.review!.body).toBeTruthy();
      expect(result.review!.body).toContain('threshold');
    });

    it('no review when reportOn filters all findings and failOn threshold not met', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'medium',
            title: 'Medium Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
        ],
      };

      // reportOn=critical filters out medium finding (no comments)
      // failOn=high: medium doesn't meet threshold, so no REQUEST_CHANGES needed
      // Result: no review posted (nothing useful to show)
      const result = renderSkillReport(report, { failOn: 'high', reportOn: 'critical' });
      expect(result.review).toBeUndefined();
    });

    it('REQUEST_CHANGES uses allFindings when report.findings is modified (deduplication)', () => {
      // Simulate deduplication scenario: report.findings has been reduced
      // but allFindings contains the original set including a critical finding
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f2',
            severity: 'low',
            title: 'Low Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
        ],
      };

      const allFindings = [
        {
          id: 'f1',
          severity: 'critical' as const,
          title: 'Critical Issue (deduplicated)',
          description: 'Details',
          location: { path: 'src/a.ts', startLine: 1 },
        },
        ...report.findings,
      ];

      // Without allFindings, would use report.findings (only low) -> COMMENT
      // With allFindings (includes critical), should be REQUEST_CHANGES
      const result = renderSkillReport(report, { failOn: 'high', allFindings });
      expect(result.review).toBeDefined();
      expect(result.review!.event).toBe('REQUEST_CHANGES');
      // Comments only include the low finding (what's in report.findings)
      expect(result.review!.comments).toHaveLength(1);
      expect(result.review!.comments[0]!.body).toContain('Low Issue');
    });

    it('REQUEST_CHANGES when some findings are filtered by reportOn but others meet both thresholds', () => {
      const report: SkillReport = {
        ...baseReport,
        findings: [
          {
            id: 'f1',
            severity: 'critical',
            title: 'Critical Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 1 },
          },
          {
            id: 'f2',
            severity: 'high',
            title: 'High Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 10 },
          },
          {
            id: 'f3',
            severity: 'medium',
            title: 'Medium Issue',
            description: 'Details',
            location: { path: 'src/a.ts', startLine: 20 },
          },
        ],
      };

      // reportOn=critical filters to only critical finding
      // failOn=high: critical and high findings both meet threshold -> REQUEST_CHANGES
      const result = renderSkillReport(report, { failOn: 'high', reportOn: 'critical' });
      expect(result.review!.event).toBe('REQUEST_CHANGES');
      expect(result.review!.comments).toHaveLength(1);
      expect(result.review!.comments[0]!.body).toContain('Critical Issue');
    });
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

  describe('reportOn filtering', () => {
    it('filters findings by reportOn threshold', () => {
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

      // reportOn='high' should only include critical and high
      const result = renderSkillReport(report, { reportOn: 'high' });

      expect(result.review).toBeDefined();
      expect(result.review!.comments).toHaveLength(2);
      expect(result.review!.comments.map((c) => c.body)).toEqual([
        expect.stringContaining('Critical Issue'),
        expect.stringContaining('High Issue'),
      ]);
    });

    it('shows all findings when reportOn is not specified', () => {
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

      const result = renderSkillReport(report, { reportOn: 'high' });

      expect(result.review).toBeUndefined();
      expect(result.summaryComment).toContain('No findings to report');
    });

    it('applies reportOn filter before maxFindings limit', () => {
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

      // With reportOn='high' and maxFindings=2, should only show critical (1 finding)
      // because low findings are filtered out first
      const result = renderSkillReport(report, { reportOn: 'high', maxFindings: 2 });

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
        reportOn: 'high',
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
        reportOn: 'high',
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
        reportOn: 'high',
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
        reportOn: 'high',
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
        reportOn: 'high',
        checkRunUrl: 'https://github.com/owner/repo/runs/123',
        totalFindings: 1,
      });

      expect(result.summaryComment).not.toContain('View');
      expect(result.summaryComment).not.toContain('additional finding');
    });
  });
});
