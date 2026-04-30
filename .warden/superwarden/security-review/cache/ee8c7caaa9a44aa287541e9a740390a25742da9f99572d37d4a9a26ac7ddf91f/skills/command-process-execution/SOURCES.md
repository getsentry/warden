# security-review-command-process-execution Child Skill Sources

## Superwarden Parent Context

- **Parent Skill**: security-review
- **Parent Plan Hash**: ee8c7caaa9a44aa287541e9a740390a25742da9f99572d37d4a9a26ac7ddf91f
- **Task ID**: command-process-execution
- **Task Title**: Command Execution and Process Spawning Security

## Parent Superwarden Plan

The parent Superwarden plan identified command execution and process spawning security as one of six focused child tasks derived from the broad security-review skill. The parent plan synthesis assessed source depth, identified research needs (Node.js command injection CVEs, safe spawning practices), and generated focused task prompts requiring:

- Deep repo-local investigation with data-flow tracing
- Current public documentation for framework/runtime behavior affecting exploitability
- Changed-line anchoring and concrete evidence
- Prohibition on sending repository code to web tools
- Empty findings array when evidence is insufficient

## Repository Source Inspection

Child skill synthesis inspected the following repository sources:

### Command Execution Utilities

**`src/utils/exec.ts`** (138 lines):
- `execNonInteractive(command, options)`: Executes shell commands with `spawnSync(command, { shell: true })`. **Vulnerable to command injection** if `command` contains untrusted input.
- `execFileNonInteractive(file, args, options)`: Executes binaries with argument arrays using `spawnSync(file, args)` without shell. **Safe from command injection** when `file` and `args` are controlled.
- `execGitNonInteractive(args, options)`: Wraps `execFileNonInteractive('git', args)` with `GIT_NON_INTERACTIVE_ENV` environment variables. **Safe pattern** for git commands.
- `buildSpawnOptions(options)`: Merges `options.env` with `process.env` using spread syntax: `env: options?.env ? { ...process.env, ...options.env } : process.env`. **Vulnerable to environment injection** if `options.env` contains untrusted input.
- `ExecError`: Exposes stderr as public readonly property and includes it in error message. **Potential information leak** if error is logged/rendered without sanitization.

**`src/cli/git.ts`** (373 lines):
- All git command invocations use `execGitNonInteractive` with hardcoded argument arrays (e.g., `git(['rev-parse', '--abbrev-ref', 'HEAD'])`). **Safe pattern**.
- No shell command construction from untrusted input identified.

**`src/cli/commands/setup-app/browser.ts`** (44 lines):
- `openBrowser(url)`: Uses `execFile(command, args)` (async, no shell) with URL in argument array. **Safe from command injection** but Windows `cmd /c start` receives URL as argument, potentially vulnerable to argument injection if URL contains spaces or special characters.

### Claude Runtime and Tool Permission Enforcement

**`src/sdk/runtimes/claude.ts`** (409 lines):
- `runSkill`: Configures Claude Agent SDK with:
  - `permissionMode: 'bypassPermissions'`: Bypasses interactive permission prompts.
  - `allowedTools`: Only read-only tools (`Read`, `Grep`, `Glob`, optionally `WebFetch`, `WebSearch`).
  - `disallowedTools`: Explicitly blocks `Bash`, `Write`, `Edit`, `Task`, `TodoWrite`.
- **Permission boundary enforcement**: Mutating tools (including Bash) are blocked at the SDK level. Changed code that alters `disallowedTools`, `permissionMode`, or tool filtering could introduce permission bypass.
- No subprocess invocation within Claude runtime; subprocess execution is delegated to SDK.

**`src/sdk/runtimes/types.ts`** (117 lines):
- Defines `SkillRunRequest` with `tools?: ToolConfig` for allowed/denied tool configuration.
- No subprocess invocation or permission enforcement logic in types.

### Tool Binary Resolution

**`src/action/workflow/base.ts`** (lines 85-134):
- `findClaudeCodeExecutable()`: Checks `CLAUDE_CODE_PATH` environment variable, then `~/.local/bin/claude`, then uses `execFileNonInteractive('which', ['claude'])`, then tries hardcoded paths (`/usr/local/bin/claude`, `/usr/bin/claude`). **Vulnerable to binary substitution** if attacker controls `CLAUDE_CODE_PATH` or PATH.
- `isExecutable(path)`: Uses `execFileNonInteractive('test', ['-x', path])` to check executability. **Safe pattern**.

**`src/sdk/auth.ts`** (45 lines):
- `verifyAuth()`: Uses `execFileNonInteractive('claude', ['--version'])` without absolute path. **Relies on PATH resolution**. Safe if PATH is trusted, but vulnerable if attacker can prepend to PATH.

### Config Schema

**`src/config/schema.ts`** (first 100 lines):
- Defines `ToolNameSchema` including 'Bash'.
- Defines `ToolConfigSchema` with `allowed` and `denied` arrays.
- No subprocess invocation or permission enforcement logic in schema.

## External Sources Consulted

Child skill synthesis consulted current public documentation for Node.js command injection mitigations and safe spawning practices:

### CVE-2024-27980: Node.js child_process Batch File Injection (April 2024)

**Source**: [Node.js — Wednesday, April 10, 2024 Security Releases](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2)

**Relevance**: Demonstrates that `child_process.spawn` without shell option can still enable command injection on Windows due to improper batch file handling. Affects Warden's subprocess invocation security model, especially if Windows deployment is supported.

**Key Points**:
- Malicious command line argument can inject arbitrary commands even if shell option is not enabled.
- Affects all Windows users in active release lines (18.x, 20.x, 21.x) before April 2024 patch.
- Remediation: Upgrade Node.js, sanitize and validate arguments, avoid spawn/spawnSync with untrusted input.

### CVE-2024-36138: Incomplete Fix for CVE-2024-27980 (July 2024)

**Source**: [CVE-2024-36138 : NODE.JS UP TO 18.20.3/20.15.0/22.4.0 ON WINDOWS INCOMPLETE FIX CVE-2024-27980 CHILD_PROCESS.SPAWN/CHILD_PROCESS.SPAWNSYNC COMMAND INJECTION - Prophaze](https://www.prophaze.com/cve/cve-2024-36138/)

**Relevance**: Follow-up vulnerability demonstrating continued risk in Windows batch file handling. Reinforces need for defense-in-depth (argument validation, allowlists, avoiding spawn with untrusted input on Windows).

### Node.js child_process Security Best Practices (2026)

**Source**: [Secure JavaScript Coding Practices Against Command Injection Vulnerabilities](https://www.nodejs-security.com/blog/secure-javascript-coding-practices-against-command-injection-vulnerabilities)

**Relevance**: Current best practices for preventing command injection in Node.js child_process usage.

**Key Points**:
- Avoid `child_process.exec()` (executes shell command, vulnerable to injection).
- Use `execFile()` or `spawn()` without shell (require arguments as array, prevent injection).
- Use double dash (`--`) to signal end of options, preventing flag injection.
- Validate and sanitize user input with regex or allowlists.
- Override environment variables carefully to prevent leaking parent process environment.
- Windows-specific concerns: batch file handling can enable injection even without shell option.

**Source**: [Node.js Secure Coding: Defending Against Command Injection Vulnerabilities](https://www.nodejs-security.com/book/command-injection)

**Relevance**: Comprehensive guide on command injection defense in Node.js, including environment variable injection and argument manipulation.

**Key Points**:
- Attackers can manipulate command behavior by controlling arguments.
- Effective mitigation involves using double dash (`--`) to signal end of arguments and options parsing.
- Environment variables can influence subprocess behavior (PATH, LD_PRELOAD, NODE_OPTIONS).
- Construct commands as separate strings from user input to prevent injection through manipulation of spaces or special characters.

## Missing Context

The following context would improve child skill precision but was not available during synthesis:

1. **Bash tool permission enforcement model**: Whether permissions are checked at declaration time, runtime, or both. Whether permission state is persisted or ephemeral. How `permissionMode: 'bypassPermissions'` affects runtime behavior. Whether skills can request Bash tool permission elevation.

2. **Subprocess sandboxing**: Whether Warden subprocess execution is isolated (containers, seccomp, process namespaces) or runs with full repository access. Whether child processes inherit parent privileges.

3. **Tool binary verification**: Whether critical tools (git, claude, npm) are verified via signatures, hashes, or trust-on-first-use before execution. Whether binary substitution attacks are in threat model.

4. **Environment variable propagation policy**: Which environment variables are intentionally propagated to subprocesses vs. which should be filtered. Whether `GIT_NON_INTERACTIVE_ENV` is the only environment override or if others exist.

5. **PATH trust model**: Whether PATH is considered trusted (e.g., set by CI environment) or untrusted (e.g., influenced by repository config). Whether Warden supports Windows deployment (affects CVE-2024-27980 applicability).

6. **Deployment model**: Whether Warden runs in CI (trusted PATH, controlled environment) or locally (potentially untrusted PATH, user-controlled environment).

## Decisions

- **Anchor findings to changed lines**: Every finding must reference specific changed line numbers where untrusted input flows into subprocess operations.

- **Require concrete data-flow traces**: Trace from untrusted input source (PR file path, config value, skill argument) to vulnerable subprocess operation (shell command construction, spawn with shell, argument injection, environment injection, binary resolution).

- **Reference repository patterns**: Compare changed code to existing safe patterns (`execFileNonInteractive`, `execGitNonInteractive`) and permission enforcement (`disallowedTools` in Claude runtime).

- **Cite CVEs and best practices when behavior affects findings**: Reference CVE-2024-27980, CVE-2024-36138, and Node.js best practices when framework/runtime behavior affects exploitability.

- **Prohibit repository code in web tools**: Use only public framework, API, vulnerability class, and ecosystem names in WebSearch/WebFetch queries.

- **Represent missing context explicitly**: State missing context (permission model, sandboxing, PATH trust) and describe what evidence would confirm or rule out vulnerabilities. Do not invent facts.

- **Return empty findings when evidence is insufficient**: Do not report speculative findings. Require complete data-flow trace and concrete attack path before reporting.
