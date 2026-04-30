# secrets-credentials Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
|--------|-----------|-----------|--------------|------------------|
| `src/action/inputs.ts` | canonical | high | Action input parsing, environment variable precedence, token type detection | Read-only; do not send to web tools |
| `src/config/loader.ts` | canonical | high | Config file loading, merging, environment variable access via `emptyToUndefined()` | Read-only; do not send to web tools |
| `src/cli/output/reporter.ts` | canonical | high | Console logging patterns (`console.error`, `console.log`), reporter output | Read-only; do not send to web tools |
| `src/cli/output/jsonl.ts` | canonical | high | JSONL log writing, report serialization, file I/O | Read-only; do not send to web tools |
| `src/sentry.ts` | canonical | high | Sentry initialization, error reporting, context setting, `captureException()` | Read-only; do not send to web tools |
| `src/sdk/errors.ts` | canonical | high | `sanitizeErrorMessage()` implementation, credential redaction patterns | Read-only; do not send to web tools |
| `src/action/workflow/base.ts` | canonical | high | `setOutput()`, `writeFindingsOutput()`, GitHub Action output contract | Read-only; do not send to web tools |
| `src/action/workflow/pr-workflow.ts` | canonical | high | Workflow orchestration, error handling, log groups, Sentry spans | Read-only; do not send to web tools |
| `action.yml` | canonical | high | GitHub Action input/output contract, environment variable mapping | Read-only; do not send to web tools |
| GitHub Actions secrets docs | trusted | medium | Automatic masking, output sanitization, structured data avoidance | Public names only |
| Node.js security best practices | trusted | medium | Environment variable security, credential exposure patterns | Public names only |
| Sentry documentation | trusted | medium | Error context sanitization, PII scrubbing | Public names only |

## Decisions

**Decision**: Require exact changed-line anchoring for all findings.
**Evidence**: Superwarden parent plan task prompt explicitly requires "exact changed line numbers where the exposure occurs" and "concrete data-flow trace."

**Decision**: Use `sanitizeErrorMessage()` from `src/sdk/errors.ts` as the reference redaction pattern.
**Evidence**: `sanitizeErrorMessage()` redacts `sk-ant-*` tokens, Bearer tokens, and API keys using regex. This is the existing control for credential exposure in error messages.

**Decision**: Exclude in-memory credential passing within the same process.
**Evidence**: Parent plan task prompt excludes "theoretical leakage requiring interception of trusted internal communication."

**Decision**: Include GitHub Action output sanitization (`setOutput()`) in scope.
**Evidence**: `src/action/workflow/base.ts` writes to `GITHUB_OUTPUT` using heredoc format. Action outputs are a documented exposure sink in the task prompt.

**Decision**: Include Sentry error reporting in scope.
**Evidence**: `src/sentry.ts` initializes Sentry with `anthropicAIIntegration({ recordInputs: true, recordOutputs: true })`. Error context may contain credentials.

**Decision**: Require public-only research when external behavior affects findings.
**Evidence**: Superwarden parent artifact and task prompt both prohibit sending repository code, secrets, or private file paths to web tools.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|----------------|----------|
| Vulnerability prerequisites | complete | Task prompt requires "concrete triggering conditions," "realistic impact," and "smallest safe fix." Skill includes prerequisite analysis (error path, debug mode, config option). |
| Exploitable dataflow examples | complete | Skill requires "concrete data-flow trace from secret source to exposure sink" with specific examples (environment variable → error message → console.log → Action logs). |
| False-positive controls | complete | Skill excludes safe credential handling (masked values, redacted logs), theoretical leakage, and unchanged code without new exposure. Withhold findings when evidence is insufficient. |
| Severity/confidence calibration | complete | Task prompt requires "realistic impact" (token theft, credential leakage, environment disclosure). Skill anchors severity to exposure mechanism and exploitability. |
| Remediation patterns | complete | Skill provides "smallest safe fix with concrete redaction or access control guidance" including `sanitizeErrorMessage()`, GitHub Actions masking, file permissions, and Sentry PII filtering. |
| Framework/runtime caveats | complete | Skill references GitHub Actions automatic masking, Node.js environment variable behavior, Sentry PII scrubbing, and OAuth token handling. Uses public guidance when external behavior affects findings. |
| API surface | complete | Covered: `process.env`, `console.log/error/warn`, `writeFileSync`, `appendFileSync`, `setOutput`, `Sentry.captureException`, `sanitizeErrorMessage`. |
| Config/runtime options | complete | Covered: GitHub Action inputs (`anthropic-api-key`, `github-token`), environment variable precedence (`ANTHROPIC_API_KEY`, `WARDEN_ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`), Sentry DSN configuration. |
| Common use cases | complete | Covered: Action input parsing, error handling, JSONL logging, GitHub output writing, Sentry error reporting, config file writes. |
| Known issues/workarounds | complete | Known limitations documented: runtime-only exposure paths, in-memory process inspection, dynamic credential construction, GitHub Actions masking confirmation. |
| Version/migration variance | complete | Skill uses current public guidance (2026). Maintenance notes require updates when Node.js, GitHub Actions, or Sentry security best practices evolve. |

## Open Gaps

**No critical gaps identified.** The child skill has sufficient local source coverage and public security guidance to detect credential exposure in changed TypeScript code.

**Potential future enhancements:**

1. Add coverage for credential exposure through process environment inspection (e.g., `/proc/<pid>/environ` on Linux) if Warden adds subprocess spawning with inherited environment.
2. Add coverage for credential exposure through core dumps or crash reports if Warden integrates with crash reporting beyond Sentry.
3. Add coverage for credential exposure through browser DevTools or extension APIs if Warden adds a web UI component.

**Next validation steps:**

1. Run the skill against a test change that logs `process.env['ANTHROPIC_API_KEY']` directly.
2. Verify the skill reports the exposure with exact line numbers and data flow.
3. Apply `sanitizeErrorMessage()` and verify the finding is resolved.
4. Run the skill against the current Warden codebase and confirm no false positives.

## Changelog

- **2026-04-30**: Initial synthesis of `secrets-credentials` child skill for Superwarden parent `security-review`.
  - Inspected local repository source: `src/action/inputs.ts`, `src/config/loader.ts`, `src/cli/output/reporter.ts`, `src/cli/output/jsonl.ts`, `src/sentry.ts`, `src/sdk/errors.ts`, `src/action/workflow/base.ts`, `src/action/workflow/pr-workflow.ts`, `action.yml`.
  - Consulted public security guidance: GitHub Actions secrets best practices (automatic masking, output sanitization), Node.js environment variable security (credential exposure through logging), Sentry PII scrubbing.
  - Identified secret sources: `process.env['ANTHROPIC_API_KEY']`, `WARDEN_ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, `GITHUB_TOKEN`, `WARDEN_SENTRY_DSN`, GitHub Action inputs.
  - Identified exposure sinks: console logs, file writes, GitHub Action outputs, error messages, Sentry error reporting, JSONL logs, rendered output.
  - Defined data-flow analysis requirements: exact line numbers, concrete trace from source to sink, triggering conditions, realistic impact, smallest safe fix.
  - Defined false-positive controls: exclude safe credential handling, theoretical leakage, unchanged code without new exposure.
  - Defined remediation patterns: `sanitizeErrorMessage()`, GitHub Actions masking, file permissions, Sentry PII filtering.
