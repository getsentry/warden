# secrets-credentials Specification

## Intent

This child skill detects secret leakage, credential exposure, token mishandling, and environment variable disclosure in changed TypeScript code within Warden's runtime ecosystem.

It identifies exposure paths where secrets from GitHub Actions, local credentials, API tokens, or environment variables are logged, written to files, included in Action outputs, rendered in reports, or leaked through error messages.

## Scope

In scope:

- Secret and credential exposure in changed TypeScript files
- Data flow from secret sources (process.env, GitHub Action inputs, credential files, API tokens) to exposure sinks (logs, file writes, Action outputs, error messages, rendered output, LLM prompts)
- GitHub Action environment variable handling (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, `WARDEN_SENTRY_DSN`)
- Logging statements that may leak credentials (`console.log`, `console.error`, logger methods)
- Error messages containing secrets (uncaught exceptions, diagnostic output, stack traces)
- Config file writes that expose secrets without permission restrictions
- GitHub Action output sanitization (`setOutput()`, `GITHUB_OUTPUT` heredoc format)
- Cache file permissions and credential storage in JSONL logs or skill artifacts
- Prompt context leakage (secrets included in LLM prompts)
- Rendered findings containing environment variables or credentials
- Sentry error reporting with secrets in context

Out of scope:

- Generic secrets management advice without concrete exposure paths
- Credential issues in unchanged code unless the change introduces new exposure
- Theoretical leakage requiring interception of trusted internal communication
- Code style, dependency freshness, or architectural preferences
- Speculative leakage without confirmed output sink

## Users And Trigger Context

- **Primary users**: Warden maintainers and security reviewers running security-review against changed code
- **Trigger context**: Invoked as a Superwarden child task when security-review is synthesized or run against changed files
- **Common scenarios**:
  - Pull request reviews of changes to Action integration, config loading, logging, or error handling
  - Security audits of credential handling in SDK runtime, remote skill loading, or output rendering
  - Pre-release security validation of changes affecting secret storage or transmission

## Runtime Contract

- This child skill is executed by the Superwarden runtime via `warden <files> --skill security-review`
- The skill receives changed TypeScript files as input and performs deep repo-local investigation
- External research uses only public framework, package, API, vulnerability class, and documentation names
- Repository code, secrets, private file paths, and proprietary details are never sent to web tools
- Findings must anchor to exact changed line numbers with concrete evidence
- The skill returns findings in Warden's normal JSON schema, not a custom format
- When evidence is insufficient, the skill withholds findings and states missing context

## Source And Evidence Model

**Authoritative sources:**

- Changed TypeScript files in the Warden repository (`src/action/`, `src/cli/`, `src/config/`, `src/sdk/`, `src/output/`, `src/sentry.ts`)
- `action.yml`: GitHub Action input/output contract and environment variable mapping
- `src/action/inputs.ts`: Action input parsing, environment variable precedence, token type detection
- `src/config/loader.ts`: Config file loading, merging, and environment variable access
- `src/cli/output/reporter.ts`, `src/cli/output/jsonl.ts`: Output rendering and logging
- `src/sentry.ts`: Sentry initialization, error reporting, and context setting
- `src/sdk/errors.ts`: Error sanitization, credential redaction patterns, authentication error handling
- `src/action/workflow/base.ts`: GitHub Action output writing (`setOutput()`, `writeFindingsOutput()`)
- `src/action/workflow/pr-workflow.ts`: Workflow orchestration, error handling, log groups

**Public security guidance:**

- GitHub Actions secrets best practices (automatic masking, output sanitization, structured data avoidance)
- Node.js environment variable security (credential exposure through logging, error messages, process inspection)
- Sentry PII scrubbing and error context sanitization
- OAuth token handling and API key redaction patterns

**Key patterns identified:**

1. **Credential redaction exists**: `sanitizeErrorMessage()` in `src/sdk/errors.ts` redacts `sk-ant-*` tokens, Bearer tokens, and API keys from error messages using regex patterns.

2. **Action output uses heredoc format**: `setOutput()` in `src/action/workflow/base.ts` uses GitHub Actions heredoc format with random delimiters to prevent injection. No explicit secret masking is applied before writing to `GITHUB_OUTPUT`.

3. **Environment variable access**: `src/action/inputs.ts` reads `ANTHROPIC_API_KEY`, `WARDEN_ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, `GITHUB_TOKEN`, and `WARDEN_SENTRY_DSN` from `process.env`. The parsed values are stored in `ActionInputs` and passed through workflow functions.

4. **Sentry integration**: `src/sentry.ts` initializes Sentry with `anthropicAIIntegration({ recordInputs: true, recordOutputs: true })`. Error context may include credentials if not filtered before `captureException()`.

5. **JSONL logging**: `src/cli/output/jsonl.ts` writes skill reports, findings, and metadata to `.warden/logs/*.jsonl`. Environment variables or credentials in report metadata would be persisted to disk.

6. **Error handling**: Workflow error handlers in `src/action/main.ts`, `src/action/workflow/pr-workflow.ts`, and `src/action/workflow/base.ts` log errors using `console.error()` and GitHub Actions `::error::` format. Errors containing credentials would be exposed in Action logs unless sanitized.

7. **Findings output file**: `writeFindingsOutput()` in `src/action/workflow/base.ts` serializes reports to JSON and writes to `RUNNER_TEMP/warden-findings.json`. Credentials in findings or metadata would be written to this file.

## Reference Architecture

**Secret sources:**

- `process.env['ANTHROPIC_API_KEY']`, `process.env['WARDEN_ANTHROPIC_API_KEY']`, `process.env['CLAUDE_CODE_OAUTH_TOKEN']`
- `process.env['GITHUB_TOKEN']`, `process.env['WARDEN_SENTRY_DSN']`
- `inputs.anthropicApiKey`, `inputs.oauthToken`, `inputs.githubToken` (parsed in `src/action/inputs.ts`)
- Credential files, cached tokens, remote skill API tokens

**Exposure sinks:**

- Console logs: `console.log()`, `console.error()`, `console.warn()`, `console.debug()`
- Logger methods: `logger.info()`, `logger.warn()`, `logger.error()`
- File writes: `writeFileSync()`, `appendFileSync()` to JSONL logs, cache files, config files, findings output
- GitHub Action outputs: `setOutput()` writing to `process.env['GITHUB_OUTPUT']`
- Error messages: `Error.message`, `throw new Error()`, `Sentry.captureException()`
- Rendered output: JSONL findings, markdown reports, GitHub checks, review comments
- LLM prompts: skill execution context, config-driven instructions

**Data flow examples:**

1. `process.env['ANTHROPIC_API_KEY']` → `parseActionInputs()` → `inputs.anthropicApiKey` → error message → `console.error()` → GitHub Action logs
2. `inputs.githubToken` → workflow context → Sentry error context → `captureException()` → Sentry dashboard
3. `process.env['WARDEN_SENTRY_DSN']` → `initSentry()` → Sentry initialization → error logs
4. `inputs.anthropicApiKey` → `executeTrigger()` → skill report metadata → JSONL log → `.warden/logs/*.jsonl`
5. `process.env['GITHUB_TOKEN']` → Octokit initialization → error stack trace → `console.error()` → Action logs

**Existing controls:**

- `sanitizeErrorMessage()` in `src/sdk/errors.ts` redacts known token patterns
- `setOutput()` uses heredoc format with random delimiters to prevent injection
- GitHub Actions automatically masks registered secrets in logs

**Missing controls:**

- No explicit filtering of credentials before `Sentry.captureException()`
- No redaction of environment variables in error messages outside `sanitizeErrorMessage()`
- No file permission restrictions on JSONL logs or findings output containing metadata
- No validation that `setOutput()` values do not contain credentials

## Evaluation

**Lightweight validation:**

1. Run `Grep` for `process.env`, `console.log`, `console.error`, `writeFileSync`, `setOutput`, `captureException` in changed files
2. Trace data flow from environment variable access to output sinks
3. Check for use of `sanitizeErrorMessage()` before logging or throwing errors
4. Verify that GitHub Action outputs do not include raw credential values

**Behavioral validation:**

1. Introduce a change that logs `process.env['ANTHROPIC_API_KEY']` directly
2. Run the skill against the change and verify it reports the exposure
3. Apply `sanitizeErrorMessage()` and verify the finding is resolved

**Acceptance gates:**

- Changed-line anchoring with exact line numbers
- Concrete data-flow trace from secret source to exposure sink
- Identified triggering conditions (error path, config option, workflow input)
- Realistic impact (token theft, credential leakage, environment disclosure)
- Smallest safe fix with redaction or access control guidance
- No false positives for safe credential handling (e.g., masked values, redacted logs)

## Known Limitations

- This skill cannot detect runtime-only exposure paths that depend on deployment configuration (e.g., file permissions set by the hosting environment)
- Credential exposure through in-memory process inspection or debugger attachment is out of scope
- The skill relies on static analysis and may miss dynamic credential construction or obfuscation
- Public security guidance may lag behind latest framework or runtime behavior; the skill uses best-effort research
- The skill cannot confirm whether GitHub Actions automatic masking will redact a specific value without testing in a live workflow

## Maintenance Notes

- Update secret source patterns when new environment variables or credential types are added to Warden
- Update exposure sink patterns when new logging, output, or error handling mechanisms are introduced
- Update redaction guidance when new sanitization functions are added or existing patterns change
- Regenerate this child skill after changes to the parent security-review prompt or Superwarden synthesis contract
- Consult public security guidance when Node.js, GitHub Actions, or Sentry security best practices evolve
