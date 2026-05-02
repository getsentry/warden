export const SKILL_BUILDER_REFERENCE_ROLES = [
  'procedure',
  'examples',
  'decision-guide',
  'reference-table',
  'troubleshooting',
] as const;

export type SkillBuilderReferenceRole = (typeof SKILL_BUILDER_REFERENCE_ROLES)[number];

export const SKILL_BUILDER_GENERIC_REFERENCE_BASENAMES = new Set([
  'context.md',
  'misc.md',
  'notes.md',
  'note.md',
  'patterns.md',
  'pattern.md',
  'research.md',
]);

export const SKILL_BUILDER_REQUIRED_PROCEDURE_HEADINGS = [
  '## When To Use',
  '## Investigate In Order',
  '## Evidence To Require',
  '## Safe Counterpatterns',
  '## Do Not Report',
  '## Severity And Confidence',
] as const;

export const SKILL_BUILDER_REQUIRED_EXAMPLES_HEADINGS = [
  '## True Positives',
  '## Safe Lookalikes',
  '## Corrected Patterns',
] as const;

export const SKILL_WRITER_ROUTER_GUIDANCE = `Use the skill-writer reference-backed model:
- SKILL.md is the router.
- references/ files are lookup leaves.
- SOURCES.md stores provenance and decisions, not runtime guidance.
- Build a reference-backed-expert skill with prompt-chaining only where it clarifies ordered work.
- Keep SKILL.md short, directive, and scan-friendly.
- Create as many or as few reference files as needed. One file is fine when it answers one lookup need cleanly. Multiple files are better when examples, procedures, tables, or troubleshooting would otherwise get mixed together.
- Filenames must predict why they are opened.
- Split by lookup need, not by vague topic bucket.
- Avoid vague runtime filenames like notes.md, context.md, patterns.md, or research.md.
- references/ subfolders are good when they clarify the lookup path, for example references/examples/xss/rails.md or references/frameworks/auth/django.md.
- Long references need ## Contents or should be split further.
- Every reference must have a direct open-when reason in the runtime router or checklist.
- Keep provenance, decision logs, and source notes out of runtime references.`;

export const SKILL_WRITER_REFERENCE_ROLE_GUIDANCE = `Reference roles:
- procedure: ordered investigation steps, evidence requirements, boundaries, calibration
- examples: true positives, safe lookalikes, corrected patterns
- decision-guide: branch logic or route selection inside a track
- reference-table: compact facts, API differences, framework behaviors, safe/unsafe mappings
- troubleshooting: common misreads, failure cases, suppressors, or recovery guidance`;
