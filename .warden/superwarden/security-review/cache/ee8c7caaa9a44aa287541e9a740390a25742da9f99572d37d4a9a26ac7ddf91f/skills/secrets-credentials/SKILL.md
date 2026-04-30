---
name: security-review-secrets-credentials
description: Detect secret, token, credential, and environment variable exposure in changed TypeScript code through logging, output rendering, error messages, cache writes, or untrusted sink propagation.
allowed-tools: Read Grep Glob WebFetch WebSearch
---

**Superwarden Child Skill: security-review / secrets-credentials**

This is a Superwarden child skill synthesized from parent skill `security-review` for task `secrets-credentials`.

---

## Objective

Review changed TypeScript code for secret and credential exposure vulnerabilities in Warden's runtime, CLI, GitHub Action, config loading, skill loading, SDK execution, and output rendering.

## Investigation Requirements

**Perform deep repo-local investigation:**
- Use Read, Grep, and Glob to inspect changed lines, their data-flow callers, and existing secret handling patterns.
- Trace changed code paths from secret sources (environment variables, config fields, GitHub Secrets) to exposure sinks (console.log, Action outputs, cache files, subprocess arguments, LLM prompts).
- Reference repository source for existing sanitization patterns (e.g., src/sdk/errors.ts sanitizeErrorMessage).

**Use public external sources when external behavior affects findings:**
- Search for current public documentation on GitHub Actions secret masking behavior, Node.js process argument visibility, and LLM API logging policies when framework or runtime behavior affects the attack path.
- Use WebSearch or WebFetch for public framework, API, vulnerability class, and ecosystem security guidance.
- **Do NOT send repository code, secrets, private file paths, or proprietary details to web tools.** Use only public framework names (GitHub Actions, Node.js, Anthropic Claude API, child_process), package names, API references, and vulnerability class names.

## Scope

Inspect changed lines and their data-flow paths to identify:

### 1. Logging and Error Message Exposure
Trace changed code that logs variables, exception details, debugging output, or diagnostic messages.
- Identify whether environment variables (GITHUB_TOKEN, ANTHROPIC_API_KEY, WARDEN_ANTHROPIC_API_KEY, secrets.*), configuration values (API keys, tokens), or runtime credentials flow into log statements, console output, or error formatters.
- Check if error messages include stack traces that reveal secret-containing variables.
- Examine whether CLI verbose/debug modes expose secrets.
- Search for logging statements in src/cli/output/formatters.ts, src/cli/output/reporter.ts, src/sdk/analyze.ts, and error handling paths.
- Note: Warden uses src/sdk/errors.ts sanitizeErrorMessage to redact API keys (sk-ant-*, sk-*, Bearer tokens, api_key patterns) from error messages. Check whether changed code bypasses this sanitization or introduces new exposure paths.

### 2. GitHub Action Output and Artifact Exposure
Trace changed code that writes GitHub Actions step outputs, job summaries, annotations, or uploaded artifacts.
- Identify whether secrets or tokens can propagate into ::set-output commands, markdown rendering, comment posting, or artifact files.
- Check if Action outputs are masked (::add-mask) before use.
- Examine whether PR comments include diagnostic information that could leak secrets.
- Search for Action output generation in GitHub Action entrypoints and comment rendering logic.
- Reference current GitHub Actions secret masking documentation: GitHub automatically masks recognized secrets in logs, but structured data (JSON, XML, YAML blobs) can cause redaction failures. Secret masking is not guaranteed for automatically recognized sensitive information.

### 3. Cache and Filesystem Writes
Trace changed code that writes skill caches, plan artifacts, output files, or temporary files.
- Identify whether secrets can be written to cache directories (.warden/superwarden/*/cache/), output files, or temp files without proper permissions (restrictive mode, tmpfs, cleanup).
- Check if cache keys include secret-derived values that could leak through timing or enumeration.
- Examine whether skill output files are readable by other users or processes.
- Search for cache writing in src/coordinator/superwarden.ts, src/coordinator/child-skills.ts, and filesystem operations.
- Repository context: Warden writes Superwarden plan cache JSON files and child skill artifacts under .warden/superwarden/<skill>/cache/. Check whether changed code writes secrets into these artifacts.

### 4. Prompt Construction and LLM API Calls
Trace changed code that constructs prompts for Claude API or other LLM endpoints.
- Identify whether environment secrets, repository tokens, or user credentials can be included in prompt text, system messages, or tool call parameters.
- Check if secrets are sanitized before prompt construction.
- Examine whether LLM API error responses could echo secrets.
- Search for prompt builders in src/sdk/runtimes/claude.ts, src/coordinator/agentic.ts, and src/coordinator/child-skills.ts.
- Repository context: Warden constructs prompts for Claude API using buildHunkSystemPrompt/buildHunkUserPrompt (src/sdk/prompt.ts) and childSynthesisSystemPrompt/buildChildSynthesisPrompt (src/coordinator/child-skills.ts). Check whether changed code includes secrets in these prompts.
- External context: Anthropic Claude API does not log or store user prompts for training by default. However, prompts are transmitted to Anthropic servers, and LLM error responses may echo parts of the prompt. If secrets are included in prompts, they are exposed to Anthropic's infrastructure.

### 5. Subprocess and Tool Invocation
Trace changed code that spawns child processes, invokes external tools, or constructs command arguments.
- Identify whether secrets propagate into command-line arguments (visible in process listings via ps, top, /proc/<pid>/cmdline), environment variables passed to untrusted tools, or stdin that could be logged by the tool.
- Check if secrets are passed through safer mechanisms (file descriptors, secure environment).
- Search for child_process usage and tool invocation in Bash permission handling and SDK runtime code.
- Node.js context: Command-line arguments passed to child_process.spawn or child_process.exec are visible in process listings (ps aux, /proc/<pid>/cmdline) and process.argv. Environment variables passed to child processes are also exposed to that process and can leak if the child process is compromised or logs environment state.

## Evidence Requirements

**For each finding, provide:**
- The specific changed line numbers where the secret flows into an exposure sink (log, output, cache, subprocess argument, prompt).
- The secret source (environment variable name, config field, GitHub Secret reference).
- The exposure sink (console.log, console.error, Action output command, cache file write, process argument, prompt text, stderr output).
- Concrete data-flow trace from secret source to exposure point.
- Concrete attack path showing how an attacker can trigger the exposure and retrieve the secret (e.g., fork PR, view Action logs, read cache files, inspect process arguments, send malformed input to trigger error path).
- Realistic impact (token theft, API key exfiltration, credential compromise, unauthorized API access).
- Smallest safe fix (filter/mask the secret using sanitizeErrorMessage, use secure passing mechanism like file descriptors or environment masking, avoid logging sensitive values, set restrictive file permissions on cache writes, remove secrets from prompts).

**When framework or runtime behavior affects exposure risk:**
- Cite current public documentation for GitHub Actions secret masking limitations (structured data redaction failures), Node.js process argument visibility (ps aux, /proc/<pid>/cmdline), or LLM API logging policies.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework names, package names, API references, and vulnerability class names.

**If repository context is insufficient:**
- State the missing context (e.g., cache directory permissions, Action artifact visibility, LLM provider logging policy, subprocess environment isolation).
- Describe what evidence would be required to confirm or rule out the vulnerability.
- **Do not report speculative findings.** Withhold findings when evidence is incomplete.

## Out of Scope

- Generic hardening advice unrelated to changed code secret flows.
- Recommendations to rotate secrets unless the changed code introduces a new exposure path.
- Dependency vulnerability reports unless the changed code introduces a new secret-exposing call.
- Secrets in unchanged code unless new data flow from changed lines triggers exposure.
- Theoretical secret exposure without a concrete sink in the changed code.

## Output Requirements

**Return findings array:**
- Anchor each finding to changed line numbers.
- Include concrete data-flow evidence and attack path.
- Provide realistic impact and smallest safe fix.

**If evidence is insufficient:**
- Return an empty findings array.
- Document missing context in finding comments or withheld findings notes.

---

**Repository Source Context:**
- src/sdk/errors.ts sanitizeErrorMessage redacts sk-ant-*, sk-*, Bearer tokens, api_key patterns from error messages.
- src/cli/output/reporter.ts logs to console.error via log(), logPlain(), error(), warning(), debug().
- src/sdk/analyze.ts constructs prompts via buildHunkSystemPrompt/buildHunkUserPrompt and invokes Claude API via runtime.runSkill.
- src/sdk/runtimes/claude.ts invokes Claude Agent SDK query() with systemPrompt, userPrompt, and tool configuration.
- src/coordinator/child-skills.ts writes child skill artifacts and cache JSON under .warden/superwarden/<skill>/cache/.
- src/coordinator/agentic.ts invokes runStructuredSuperwardenAgent with systemPrompt, userPrompt for Superwarden synthesis.

**External Source Context:**
- GitHub Actions secret masking: Automatic masking may fail for structured data (JSON, XML, YAML blobs). Not all sensitive information is guaranteed to be redacted.
- Node.js process arguments: Command-line arguments are visible in ps aux, top, /proc/<pid>/cmdline, and process.argv.
- Anthropic Claude API: Prompts are transmitted to Anthropic servers. LLM error responses may echo prompt content.
