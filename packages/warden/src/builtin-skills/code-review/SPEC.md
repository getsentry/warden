# Code Review Skill Specification

## Intent

The `code-review` skill is Warden's broad default correctness reviewer. It gives teams a highly adversarial bug-finding pass for code changes without turning into style, architecture, security, or best-practice commentary.

It should catch real regressions and production defects while preferring no finding over speculative review feedback.

## Scope

In scope:

- Logic, state, async, data contract, persistence, edge-case, API, public metadata/config, UI, build, test, and workflow correctness bugs.
- Changed production code, user entry points, public APIs, shipped workflows, and tests that can mask shipped regressions.
- General bug-finding guidance that applies across application code.
- Focused notes for JavaScript/TypeScript, Python, and GitHub Actions workflow correctness.

Out of scope:

- Security vulnerabilities covered by `security-review`.
- Style, readability, formatting, naming, architecture, maintainability, or generic best-practice advice.
- Performance issues without a demonstrated timeout, hang, resource exhaustion, or deadline miss.
- Broad test coverage requests unless changed tests now assert the wrong behavior or hide a real regression.
- Benchmark-specific prompt compatibility.

## Users And Trigger Context

- Primary users: coding agents and Warden runs reviewing pull requests or local changes.
- Common user requests: "code review", "review this PR", "find bugs", "bug hunt", "correctness review", "look for regressions", "adversarial review", "logic bug", "race condition", or "edge-case bug".
- Should not trigger for: security-only review, architecture review, code simplification, style review, documentation review, prompt-writing help, or Warden CLI usage.

## Runtime Contract

- Required first actions:
  - Identify whether changed files are production code, public API, shipped workflow, test/tooling code, generated/vendor/example code, or non-runtime docs.
  - Read the changed file and any callers, guards, schemas, tests, serializers, migrations, workflow-loaded scripts, or downstream consumers needed to prove the bug.
  - Load only the matching reference when it materially improves the review.
- Required outputs:
  - Warden findings only for high-confidence correctness bugs.
  - Empty findings when a concrete failure is not proven.
- Non-negotiable constraints:
  - Do not report style, architecture, maintainability, security, or best-practice-only feedback.
  - Do not lower the bar to create coverage.
  - Do not report pattern-only suspicions.
- Expected bundled files loaded at runtime:
  - `references/javascript-typescript.md` for JS/TS/Node/React/Next/browser correctness.
  - `references/python.md` for Python/Django/Flask/FastAPI/Celery correctness.
  - `references/github-workflows.md` for GitHub Actions workflow correctness.

## Source And Evidence Model

Authoritative sources:

- The existing `security-review` built-in skill structure and evidence-gated finding model.
- Local Warden review skills that distinguish bugs from architecture, style, and simplification work.
- Common production code review failure modes observed across typed application code, service code, and CI workflows.

Useful improvement sources:

- positive examples: reviewed findings that identify a real trigger, violated contract, and concrete impact.
- negative examples: noisy findings that were style, speculation, security-only, or best-practice-only comments.
- commit logs/changelogs: fixes to Warden false positives, missing bug classes, or trigger precision.
- issue or PR feedback: maintainer comments showing what should or should not be reported.
- eval results: true-positive and safe-counterexample cases for correctness defects.

Data that must not be stored:

- secrets
- customer data
- private URLs or identifiers that are not needed for reproduction

## Reference Architecture

- `SKILL.md` contains the runtime contract, adversarial review loop, category table, severity rubric, exclusions, and reference routing.
- `SOURCES.md` contains synthesis notes, coverage status, and maintenance gaps.
- `references/` contains language and workflow-specific correctness notes with false-positive controls.
- `references/evidence/` is unused until concrete positive and negative review examples are collected.
- `scripts/` and `assets/` are unused.

## Evaluation

- Lightweight validation:
  - Run the skill validator against `src/builtin-skills/code-review`.
  - Verify every reference is directly routed from `SKILL.md`.
  - Run built-in skill loader and package-content tests.
- Deeper evaluation:
  - Add eval cases for falsey defaults, dropped async work, schema mismatch, migration data loss, stale UI state, workflow false success, and safe counterexamples.
  - Compare false positives against sanitized real Warden runs.
- Holdout examples:
  - A style-only diff with no behavior change should produce no finding.
  - A security-only diff should be routed to `security-review`, not reported by `code-review`.
  - A test or golden fixture that locks in broken shipped behavior should be scored by the shipped behavior's blast radius, not by the file type.
  - A type-safe or schema-validated path should not be reported as a runtime bug.
- Acceptance gates:
  - Findings require trigger, expected behavior, actual behavior, and impact.
  - `SKILL.md` stays concise enough to scan.
  - Language-specific examples stay in references.
  - Security and style findings stay out of scope.

## Known Limitations

- The skill cannot prove bugs that require running complex integration environments unless the code path itself is sufficient evidence.
- Language coverage is intentionally strongest for JS/TS, Python, and GitHub Actions workflows.
- It may miss domain-specific business-rule bugs when the changed code does not expose the business contract.

## Maintenance Notes

- When to update `SKILL.md`: the core finding contract, exclusions, severity rubric, or reference routing changes.
- When to update `SOURCES.md`: new source categories, coverage gaps, or synthesis decisions materially change the skill.
- When to update `EVAL.md`: repeatable eval prompts are added.
- When to update `references/evidence/`: positive or negative examples recur and should shape future revisions.
