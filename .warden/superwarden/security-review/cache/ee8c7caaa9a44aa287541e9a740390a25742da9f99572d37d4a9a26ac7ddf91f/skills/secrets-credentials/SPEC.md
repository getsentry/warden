# security-review-secrets-credentials Specification

## Intent

This child skill detects secret and credential exposure vulnerabilities in changed TypeScript code where environment variables, API keys, tokens, or credentials flow into logging statements, GitHub Action outputs, cache writes, LLM prompts, or subprocess arguments without proper sanitization or masking.

## Parent Context

- **Parent Skill**: security-review
- **Task ID**: secrets-credentials
- **Superwarden Plan Cache**: ee8c7caaa9a44aa287541e9a740390a25742da9f99572d37d4a9a26ac7ddf91f.json
- **Parent Source Hash**: d2e4a18d51a9a9da573d3434eaee7486118b9965021131e6866bc8df61719437
- **Coordinator Version**: 1

## Scope

**In scope:**
- Secret, token, credential, and environment variable exposure in changed TypeScript code.
- Data-flow paths from secret sources (GITHUB_TOKEN, ANTHROPIC_API_KEY, WARDEN_ANTHROPIC_API_KEY, secrets.*, config values) to exposure sinks (console.log, console.error, GitHub Action outputs, cache files, subprocess arguments, LLM prompts).
- Logging and error message exposure vulnerabilities.
- GitHub Action output and artifact exposure vulnerabilities.
- Cache and filesystem write exposure vulnerabilities.
- Prompt construction and LLM API call exposure vulnerabilities.
- Subprocess and tool invocation exposure vulnerabilities.

**Out of scope:**
- Generic hardening advice unrelated to changed code secret flows.
- Recommendations to rotate secrets unless the changed code introduces a new exposure path.
- Dependency vulnerability reports unless the changed code introduces a new secret-exposing call.
- Secrets in unchanged code unless new data flow from changed lines triggers exposure.
- Theoretical secret exposure without a concrete sink in the changed code.

## Evidence Requirements

1. **Changed-line anchoring**: Each finding must reference specific changed line numbers where the secret flows into an exposure sink.
2. **Data-flow trace**: Include concrete path from secret source (environment variable, config field, GitHub Secret) to exposure point (log, output, cache, subprocess, prompt).
3. **Repository source reference**: Reference existing sanitization patterns (src/sdk/errors.ts sanitizeErrorMessage), logging paths (src/cli/output/reporter.ts), prompt construction (src/sdk/runtimes/claude.ts, src/coordinator/agentic.ts, src/coordinator/child-skills.ts), and cache writes (src/coordinator/superwarden.ts, src/coordinator/child-skills.ts).
4. **Public documentation citation**: When framework or runtime behavior affects the attack (GitHub Actions secret masking, Node.js process argument visibility, LLM API logging), cite current public documentation. Do not send repository code, secrets, private file paths, or proprietary details to web tools.
5. **Attack scenario**: Provide realistic attack path showing how an attacker triggers the exposure and retrieves the secret.
6. **Safe fix**: Describe the smallest safe fix with concrete approach (sanitize with sanitizeErrorMessage, mask with ::add-mask, use file descriptors, remove from prompt, set restrictive permissions).

## Reporting Contract

Each finding must include:
- **Changed lines**: Specific line numbers where secret flows into exposure sink.
- **Secret source**: Environment variable name (GITHUB_TOKEN, ANTHROPIC_API_KEY), config field, GitHub Secret reference.
- **Exposure sink**: console.log, console.error, Action output, cache file, subprocess argument, prompt text.
- **Data-flow trace**: Concrete path from source to sink.
- **Attack path**: How an attacker triggers and retrieves the exposed secret.
- **Impact**: Token theft, API key exfiltration, credential compromise, unauthorized API access.
- **Fix**: Smallest safe fix (filter/mask, secure passing, avoid logging, restrictive permissions).

**Missing context handling:**
- If evidence is insufficient (e.g., cache directory permissions, Action artifact visibility, LLM provider logging policy), state the missing context and describe required evidence.
- Do not report speculative findings. Return empty findings array when evidence is incomplete.

## Vulnerability Patterns

### 1. Logging and Error Message Exposure
- **Source**: GITHUB_TOKEN, ANTHROPIC_API_KEY, WARDEN_ANTHROPIC_API_KEY, secrets.*, config API keys
- **Sink**: console.log, console.error, console.warn, console.info, console.debug, error.message, stack traces
- **Existing sanitization**: src/sdk/errors.ts sanitizeErrorMessage redacts sk-ant-*, sk-*, Bearer tokens, api_key patterns
- **Bypass risk**: Changed code that logs errors without calling sanitizeErrorMessage, or logs raw environment variables

### 2. GitHub Action Output Exposure
- **Source**: secrets.*, environment variables, config values
- **Sink**: ::set-output, ::set-env, markdown rendering, PR comment posting, artifact uploads
- **Masking**: GitHub Actions automatically masks recognized secrets, but structured data (JSON, XML, YAML) can bypass masking
- **Attack**: Fork PR, view Action logs or artifacts, read PR comments

### 3. Cache and Filesystem Exposure
- **Source**: secrets.*, environment variables, runtime credentials
- **Sink**: writeFileSync to .warden/superwarden/*/cache/, output files, temp files
- **Risk**: Secrets written to cache JSON or skill artifacts without restrictive permissions
- **Attack**: Read cache files from filesystem (if attacker has local access or cache is uploaded as artifact)

### 4. Prompt Construction Exposure
- **Source**: environment secrets, repository tokens, user credentials
- **Sink**: systemPrompt, userPrompt sent to Claude API (src/sdk/runtimes/claude.ts query(), src/coordinator/agentic.ts runStructuredSuperwardenAgent)
- **Risk**: Secrets transmitted to Anthropic servers; LLM error responses may echo prompt content
- **Attack**: If LLM error responses are logged or returned to attacker-controlled context, secrets may leak

### 5. Subprocess Argument Exposure
- **Source**: secrets.*, environment variables
- **Sink**: child_process.spawn args array, child_process.exec command string, subprocess environment
- **Risk**: Arguments visible in ps aux, /proc/<pid>/cmdline; environment inherited by child process
- **Attack**: Inspect process listings, compromise child process to exfiltrate environment

## Repository Context

- **Error sanitization**: src/sdk/errors.ts sanitizeErrorMessage removes sk-ant-*, sk-*, Bearer tokens, api_key patterns from error messages before logging or callbacks.
- **Logging paths**: src/cli/output/reporter.ts logs via console.error (log(), logPlain(), error(), warning(), debug()).
- **Prompt construction**: src/sdk/analyze.ts buildHunkSystemPrompt/buildHunkUserPrompt, src/coordinator/child-skills.ts childSynthesisSystemPrompt/buildChildSynthesisPrompt.
- **Claude API invocation**: src/sdk/runtimes/claude.ts query() sends systemPrompt, userPrompt to Claude Agent SDK.
- **Cache writes**: src/coordinator/child-skills.ts writeFileSync to .warden/superwarden/<skill>/cache/<plan-hash>.json and child skill artifacts.

## External Context

- **GitHub Actions secret masking** (2026): Automatic masking may fail for structured data (JSON, XML, YAML blobs). Secret redaction is not guaranteed. Source: [GitHub Actions 2026 Security Roadmap](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/), [GitHub Docs: Secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- **Node.js process arguments**: Command-line arguments passed to child_process are visible in ps aux, top, /proc/<pid>/cmdline, and process.argv. Environment variables are inherited by child processes.
- **Anthropic Claude API**: Prompts are transmitted to Anthropic servers. Anthropic does not log or use customer data for training by default, but prompts are still exposed to Anthropic's infrastructure. LLM error responses may echo prompt content.
