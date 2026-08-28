# Security Review Skill Specification

## Intent

The `security-review` skill is Warden's broad default application security scanner. It gives teams a usable first-pass security review without importing benchmark prompts or requiring language-specific setup.

It should catch common exploitable vulnerabilities in changed production code while avoiding noisy hardening advice.

## Scope

In scope:

- Authentication, authorization, tenant isolation, identity, and service-boundary bugs.
- Injection, RCE, unsafe deserialization, XSS, SSRF, path traversal, unsafe redirects, webhook verification, secrets exposure, weak crypto, sensitive data exposure, and meaningful abuse-control gaps.
- General guidance that applies across web services and application code.
- Focused notes for JavaScript/TypeScript, Python, Swift/Objective-C and GitHub Actions workflows.

Out of scope:

- Full dependency CVE triage without reachable changed code.
- Compliance checklists, infrastructure-only policy review, or exhaustive cloud IAM audits.
- Style, maintainability, performance, hygiene, or non-security correctness bugs.
- Benchmark-specific prompt compatibility.
- Large language-specific catalogs in `SKILL.md`.

## Users And Trigger Context

- Primary users: coding agents and Warden runs reviewing pull requests or local changes.
- Should trigger for: "security review", "scan for vulnerabilities", "appsec review", "OWASP check", "auth bypass", "XSS", "SQL injection", "SSRF", "path traversal", "secret exposure", or equivalent security-focused review requests.
- Should not trigger for: generic code review, prompt-writing help, Warden CLI usage, or broad architecture review with no security focus.

## Runtime Contract

- Required first actions:
  - Identify whether changed files are production code or test/generated/vendor/example code.
  - Read the target file and any guards, helpers, middleware, validators, serializers, or sibling handlers needed to prove the path.
  - Load only the matching language reference when it materially improves the review.
- Required finding evidence:
  - attacker-controlled source
  - vulnerable sink or missing guard
  - crossed security boundary
  - concrete attacker-visible impact
  - verification details naming checked files/functions
- Required outputs:
  - Warden findings only for high-confidence vulnerabilities.
  - Empty findings when exploitability is not proven.
- Non-negotiable constraints:
  - Do not report pattern-only suspicions.
  - Do not lower the bar to create coverage.
  - Do not add language-specific examples to `SKILL.md`; route them to `references/`.

## Reference Architecture

- `SKILL.md` contains the broad review contract, category table, severity rubric, exclusions, and reference routing.
- `references/javascript-typescript.md` contains JS/TS/Node/React/Next-specific examples and false-positive controls.
- `references/python.md` contains Python/Django/Flask/FastAPI-specific examples and false-positive controls.
- `references/github-workflows.md` contains GitHub Actions workflow examples and false-positive controls.
- `references/apple.md` contains Apple native entry points, high-signal patterns, false-positive controls, and examples, plus mappings to topic files under `references/apple/`.
- `references/apple/ipc.md`, `storage.md`, `auth.md`, `network.md`, `webview.md`, and `crypto.md` are lookup leaves loaded only through that mapping.
- `references/apple/CONTEXT.md` and `references/apple/SOURCES.md` are authoring files, not runtime references.
- `scripts/`, `assets/`, and `references/evidence/` are unused until repeated evidence warrants them.

## Evaluation

- Lightweight validation:
  - Run the skill validator against `src/builtin-skills/security-review`.
  - Verify every reference is directly routed from `SKILL.md`.
  - Run init command tests that install bundled skills.
- Deeper evaluation:
  - Add eval cases for SQL injection, XSS, SSRF, authz bypass, secrets, and safe counterexamples.
  - Add Apple eval cases later for scheme-applied tokens, `UserDefaults` refresh tokens, `LAContext` gates, WebView bridges, and accept-any-cert handlers, plus safe counterexamples.
  - Compare false positives against sanitized real Warden runs.
- Acceptance gates:
  - `SKILL.md` stays concise enough to scan.
  - Language-specific examples stay in references.
  - Findings require exploitability evidence, not keyword matches.
  - Apple reviews load `references/apple.md`, then only the mapped topic files.

## Maintenance Notes

- Add a new language reference only when recurring findings need language-specific calibration.
- Keep Apple platforms as one system. Carve out a finding only when the API cannot run on that OS.
- Do not add pinning, resilience, or cross-platform framework catalogs to the Apple folder.
- Update `references/apple.md` when a new Apple topic is added. Do not add Apple topic rows to `SKILL.md`.
- Update `references/apple/CONTEXT.md` and `references/apple/SOURCES.md` when the Apple contract or source map changes. Do not route those files from `SKILL.md`.
- Keep examples minimal and transformed; do not store proprietary code.
