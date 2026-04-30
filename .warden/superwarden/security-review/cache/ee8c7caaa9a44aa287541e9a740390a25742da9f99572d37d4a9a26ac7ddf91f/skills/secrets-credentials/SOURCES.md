# security-review-secrets-credentials Sources

## Superwarden Plan Source

- **Parent Skill**: security-review
- **Task ID**: secrets-credentials
- **Plan Cache**: ee8c7caaa9a44aa287541e9a740390a25742da9f99572d37d4a9a26ac7ddf91f.json
- **Parent Source Hash**: d2e4a18d51a9a9da573d3434eaee7486118b9965021131e6866bc8df61719437
- **Coordinator Version**: 1

## Repository Source Inspection

### Error Sanitization Patterns
- **src/sdk/errors.ts**: `sanitizeErrorMessage` function redacts sk-ant-*, sk-*, Bearer tokens, api_key patterns from error messages before logging, callbacks, or telemetry.
  - Pattern: `/\b(sk-ant-[A-Za-z0-9_-]+)/g`, `/\b(sk-[A-Za-z0-9_-]{16,})\b/g`, `/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi`, `api_key`, `x-api-key`, `auth_token`, `oauth_token`
  - Usage: Called in src/sdk/analyze.ts error handling paths (lines 251, 351, 391), src/sdk/errors.ts classifyError

### Logging Paths
- **src/cli/output/reporter.ts**: Reporter class logs to console.error via `log()`, `logPlain()`, `error()`, `warning()`, `debug()`.
  - Methods: `log(message)` (line 79), `logPlain(message)` (line 89), `error(message)` (line 370), `warning(message)` (line 354), `debug(message)` (line 381)
  - Verbosity filtering: Quiet mode suppresses most output; debug mode includes debug messages.
  - No sanitization is applied to log messages in reporter.ts itself.

- **src/cli/output/formatters.ts**: Formatting utilities for terminal output (severity, duration, usage, costs).
  - No logging or secret handling; pure formatting logic.

### Prompt Construction
- **src/sdk/analyze.ts**: `buildHunkSystemPrompt(skill)`, `buildHunkUserPrompt(skill, hunkCtx, prContext)` construct prompts for Claude API.
  - Line 142: `const systemPrompt = buildHunkSystemPrompt(skill);`
  - Line 143: `const userPrompt = buildHunkUserPrompt(skill, hunkCtx, prContext);`
  - PR context includes title, body, changed file list (lines 647-652)
  - Prompts are sent to Claude API via runtime.runSkill (line 193)

- **src/sdk/runtimes/claude.ts**: `query()` invokes Claude Agent SDK with systemPrompt, userPrompt.
  - Line 183: `const stream = query({ prompt: userPrompt, options: { systemPrompt, ... } });`
  - Prompts transmitted to Anthropic servers
  - Line 199: stderr callback captures Claude Code subprocess stderr output

- **src/coordinator/child-skills.ts**: `childSynthesisSystemPrompt()`, `buildChildSynthesisPrompt()` construct prompts for Superwarden child skill synthesis.
  - Line 141: System prompt instructs agent to use Read, Grep, Glob, WebSearch, WebFetch
  - Line 151: User prompt includes plan JSON, task JSON, source blocks
  - Line 430: `runStructuredSuperwardenAgent` invokes Claude API with these prompts

- **src/coordinator/agentic.ts**: `runStructuredSuperwardenAgent` wraps runtime.runSkill for structured JSON output.
  - Line 110: `const response = await runtime.runSkill({ systemPrompt, userPrompt, ... });`
  - No sanitization of prompts before API call

### Cache Writes
- **src/coordinator/child-skills.ts**: Writes child skill artifacts and cache JSON.
  - Line 233: `writeFileSync(join(taskDir, 'SKILL.md'), skillContent, 'utf-8');`
  - Line 234: `writeFileSync(join(taskDir, 'SPEC.md'), specContent, 'utf-8');`
  - Line 235: `writeFileSync(join(taskDir, 'SOURCES.md'), sourcesContent, 'utf-8');`
  - Line 332: `writeFileSync(cachePath, JSON.stringify({ plan, childSkills, ... }), 'utf-8');`
  - Cache path: `.warden/superwarden/<skill>/cache/<plan-hash>.json`
  - Child skill artifact path: `.warden/superwarden/<skill>/cache/<plan-hash>/skills/<task-id>/`

- **src/coordinator/superwarden.ts**: Creates Superwarden skill root and cache directories.
  - Line 46: `mkdirSync(rootDir, { recursive: true });`
  - Line 53: `writeFileSync(skillPath, ...)`
  - Line 62: `writeFileSync(metadataPath, ...)`
  - No restrictive permissions set on cache writes

### GitHub Action Output
- Not inspected in detail (GitHub Action entrypoints not in provided files).
- Would require inspection of src/action/main.ts, src/action/workflow/base.ts for Action output generation.

### Subprocess Invocation
- **src/sdk/runtimes/claude.ts**: Invokes Claude Code subprocess via Claude Agent SDK query().
  - Line 183: `const stream = query({ prompt: userPrompt, options: { cwd: repoPath, ... } });`
  - Claude Agent SDK spawns claude CLI subprocess
  - No secrets passed as command-line arguments (prompts sent via IPC, not CLI args)
  - stderr callback (line 199) captures subprocess stderr

## External Sources

### GitHub Actions Secret Masking (2026)
- **Source**: [What's coming to our GitHub Actions 2026 security roadmap - The GitHub Blog](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/)
  - **Reason**: Documents current GitHub Actions secret masking behavior and limitations. Structured data (JSON, XML, YAML blobs) can bypass automatic secret redaction. Secret masking is not guaranteed for all sensitive information.
  - **Key Findings**: 2026 Security Roadmap introduces workflow dependency locking, Layer 7 egress firewall, scoped secrets. Secret masking causes values to be treated as secrets and redacted from logs, but structured data can cause redaction failures.

- **Source**: [GitHub Docs: Secrets](https://docs.github.com/en/actions/concepts/security/secrets)
  - **Reason**: Official GitHub documentation on secret handling in Actions. Confirms structured data redaction limitations and incomplete masking guarantees.

- **Source**: [GitHub Actions Secret Exfiltration? How to Fix It Fast (2026 Guide)](https://cloakbin.com/how-to/github-actions-secret-exfiltration)
  - **Reason**: Describes secret exfiltration attack patterns in GitHub Actions, including March 2025 supply chain attack that stole PAT from reviewdog/action-setup and exfiltrated CI/CD secrets (including Coinbase credentials) through workflow logs.

### Node.js Process Environment Variables and Command-Line Arguments
- **Source**: [Node.js Environment Variables Documentation](https://nodejs.org/api/environment_variables.html)
  - **Reason**: Official Node.js documentation on process.env and environment variable handling.

- **Source**: [Node.js Command-line API Documentation](https://nodejs.org/api/cli.html)
  - **Reason**: Official Node.js documentation on command-line argument handling and process.argv.

- **Source**: [GitHub - maximivanov/nodejs-leak-env-vars: POC of a vulnerable app leaking environment variables via a compromised NPM package](https://github.com/maximivanov/nodejs-leak-env-vars)
  - **Reason**: Demonstrates environment variable leakage through compromised npm packages in Node.js applications.

### Anthropic Claude API Security (2026)
- **Source**: [Anthropic API Key: Generate, Secure & Rotate Safely (2026 Guide) - TokenMix Blog](https://tokenmix.ai/blog/anthropic-api-key-generate-secure-rotate-2026)
  - **Reason**: Current best practices for Anthropic API key security. API key format: sk-ant-api03-... Recommends setting spend limits to cap financial exposure if key leaks.

- **Source**: [CVE-2026-42208: LiteLLM SQL Injection Leaks Upstream API Keys](https://www.abhs.in/blog/litellm-cve-2026-42208-sql-injection-ai-gateway-api-keys-exploited-2026)
  - **Reason**: Demonstrates LLM API key exfiltration vulnerability in LiteLLM proxy (CVSS 9.3) where SQL injection exposes all upstream provider API keys including Anthropic API keys. Confirms that API keys stored or transmitted by LLM infrastructure are high-value targets.

- **Source**: [Anthropic Leak Claude Code: 512,000 Lines Exposed by One Bug - Ruh AI Blog](https://www.ruh.ai/blogs/anthropic-claude-code-leak-2026-npm-source-exposure)
  - **Reason**: Documents March 31, 2026 accidental publication of Claude Code internal source to npm registry. Anthropic stated: "This was a release packaging issue caused by human error, not a security breach. No customer data or credentials were involved or exposed." Confirms Anthropic's commitment to not exposing customer credentials, but highlights risks of accidental exposure.

- **Source**: [Anthropic Claude API Key: The Essential Guide | Nightfall AI Security 101](https://www.nightfall.ai/ai-security-101/anthropic-claude-api-key)
  - **Reason**: Security guidance for Anthropic API keys, including detection patterns and exposure risks.

## Missing Inputs

1. **GitHub Action artifact visibility**: Whether Warden GitHub Action uploads cache files or output artifacts that could be downloaded by fork PR attackers.
2. **Cache directory permissions**: Whether .warden/superwarden/*/cache/ directories and files are created with restrictive permissions (0600, 0700) or default umask permissions.
3. **LLM prompt logging policy**: Whether Anthropic Claude API logs prompts for debugging or monitoring purposes (beyond transmission to servers for inference).
4. **Subprocess environment isolation**: Whether Warden spawns subprocesses (e.g., via Bash tool invocation) that inherit sensitive environment variables (GITHUB_TOKEN, ANTHROPIC_API_KEY) without filtering.
5. **GitHub Actions secret sources**: Whether Warden GitHub Action reads secrets from secrets.GITHUB_TOKEN, secrets.ANTHROPIC_API_KEY, or other secret sources that could flow into changed code paths.

## Decisions

- **Error sanitization coverage**: src/sdk/errors.ts sanitizeErrorMessage is the primary defense against secret leakage in error messages. Review changed code to ensure all error logging paths invoke sanitizeErrorMessage before console.log/console.error.
- **Prompt construction risk**: Prompts constructed in src/sdk/analyze.ts, src/coordinator/child-skills.ts, src/coordinator/agentic.ts are transmitted to Anthropic Claude API. Review changed code to ensure secrets are not included in systemPrompt, userPrompt, or PR context (title, body, file list).
- **Cache write risk**: Cache JSON and child skill artifacts written by src/coordinator/child-skills.ts, src/coordinator/superwarden.ts may persist secrets if changed code includes secrets in plan metadata, task descriptions, or source blocks.
- **GitHub Actions masking limitations**: GitHub Actions automatic secret masking may fail for structured data (JSON, XML, YAML). Changed code that renders findings as JSON or YAML in Action outputs should explicitly mask secrets with ::add-mask before output.
- **Node.js subprocess argument visibility**: Command-line arguments passed to child_process.spawn are visible in process listings. Changed code that constructs subprocess arguments from secrets should use file descriptors or environment masking instead.
