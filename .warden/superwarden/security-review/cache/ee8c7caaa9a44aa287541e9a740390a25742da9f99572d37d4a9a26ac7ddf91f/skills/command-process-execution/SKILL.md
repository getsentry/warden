---
name: security-review-command-process-execution
description: Review changed TypeScript code for command injection, unsafe process spawning, tool permission bypass, subprocess argument/environment injection, and binary resolution vulnerabilities in Warden's runtime.
allowed-tools: Read Grep Glob WebFetch WebSearch
---

# Command Execution and Process Spawning Security

This is a Superwarden child skill for parent **security-review** and task **command-process-execution**.

## Scope

Detect command injection, shell argument handling vulnerabilities, unsafe process spawning, and tool permission boundary violations in changed TypeScript code affecting Warden's Bash tool invocation, subprocess communication, and external tool execution.

## Investigation Protocol

### Repository-Local Source Inspection (Required)

You **must** perform deep repo-local investigation before reporting findings:

- Use **Read**, **Grep**, and **Glob** to inspect changed files, trace data flows from untrusted input to subprocess operations, examine existing command execution patterns, and understand tool permission enforcement.
- Trace changed lines to identify where untrusted input (PR file paths, config values, skill arguments, user input, repository metadata) flows into:
  - `child_process.exec`, `child_process.spawn` with `shell: true`, or shell command string construction
  - `child_process.spawn` or `child_process.execFile` argument arrays
  - subprocess environment variable construction
  - tool binary path resolution
  - Bash tool permission validation paths
- Examine existing subprocess invocation patterns in `src/utils/exec.ts`, `src/cli/git.ts`, `src/sdk/runtimes/claude.ts`, `src/action/workflow/base.ts`, and related modules.
- Search for permission enforcement logic affecting Bash tool invocation, including `permissionMode: 'bypassPermissions'` usage in SDK runtime code.
- Identify whether changed code introduces new subprocess call sites or alters data flow into existing subprocess operations.

### External Prior Art and Current Documentation (When Framework/Runtime Behavior Affects Findings)

Use **WebSearch** or **WebFetch** for current public documentation when framework, runtime, or vulnerability behavior affects exploitability:

- Node.js child_process command injection mitigations (CVE-2024-27980 batch file injection, CVE-2024-36138 incomplete fix, argument injection patterns)
- Safe spawning practices (spawn vs exec, shell option, argument arrays vs string concatenation)
- Environment variable subprocess inheritance and injection vectors (PATH, LD_PRELOAD, NODE_OPTIONS)
- Windows-specific batch file handling vulnerabilities
- Tool binary resolution security (PATH lookup, absolute paths, allowlists)

**Strict Prohibition**: Do **not** send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework, package, API, vulnerability class, and ecosystem convention names.

## Finding Requirements

Report findings **only** when you have:

1. **Changed-Line Anchoring**: The specific changed line numbers where untrusted input flows into command construction or process spawning without sanitization.

2. **Concrete Data-Flow Trace**: A complete trace from the untrusted input source (PR file path, config value, skill argument, user input) to the vulnerable subprocess operation (shell command construction, spawn with shell, argument injection, environment injection, binary resolution).

3. **Repository Source Evidence**: Reference to existing command execution patterns (Bash tool permission handler in `src/sdk/runtimes/claude.ts`, subprocess invokers in `src/utils/exec.ts`, `src/cli/git.ts`, tool wrapper in `src/action/workflow/base.ts`) showing how the changed code deviates from or bypasses safe patterns.

4. **Public Documentation Reference** (when behavior affects the attack): Cite current Node.js command injection mitigations (CVE-2024-27980, CVE-2024-36138) and safe spawning practices when the vulnerability depends on framework or runtime behavior.

5. **Realistic Attack Scenario**: A concrete attack path showing how an attacker with control over the untrusted input (e.g., malicious PR file path, crafted config value, manipulated skill argument) can inject commands, bypass permission boundaries, or escalate privileges.

6. **Realistic Impact**: The actual security consequence (arbitrary command execution, permission boundary bypass, sandbox escape, privilege escalation).

7. **Smallest Safe Fix**: Concrete remediation approach (use execFile/spawn without shell, argument arrays instead of string concatenation, input validation, allowlist, absolute tool paths, runtime permission revalidation).

### When Evidence Is Insufficient

If repository context is insufficient to determine command execution risk (e.g., Bash permission enforcement model unclear, subprocess sandboxing mechanism unknown, tool binary verification absent), **state the missing context** explicitly and describe what evidence would be required to confirm or rule out the vulnerability.

**Do not report speculative findings.** Return an **empty findings array** when evidence is incomplete.

## Attack Surface Review

Inspect changed lines and their data-flow paths to identify:

### 1. Command Injection via Shell Spawning

Trace changed code that invokes `child_process.exec`, `child_process.spawn` with `shell: true`, or constructs shell commands from untrusted input.

- Identify whether shell metacharacters (`;` `|` `&` `$` `` ` `` `(` `)` `<` `>` `\` `'` `"`) can be injected to execute arbitrary commands.
- Check if `execFile` or `spawn` without `shell` option is used for safer execution.
- Examine whether argument arrays are used instead of string concatenation.
- Search for `child_process` usage in Bash tool permission handling, skill execution, and subprocess invocation.
- Consult current Node.js command injection mitigations (CVE-2024-27980 Windows batch file injection, CVE-2024-36138 incomplete fix) for argument injection patterns.

**Repository Context**: Warden uses `execNonInteractive` (in `src/utils/exec.ts`) with `shell: true` for shell command execution, and `execFileNonInteractive` without shell for safer binary execution. `execGitNonInteractive` wraps git commands in `execFileNonInteractive` with argument arrays. The Claude runtime in `src/sdk/runtimes/claude.ts` uses `permissionMode: 'bypassPermissions'` for read-only skill execution.

### 2. Bash Tool Permission Boundary Enforcement

Trace changed code that validates or enforces Bash tool permission prompts (user approval for command execution).

- Identify whether permission checks can be bypassed through alternate code paths, cached approvals without revalidation, or prompt text manipulation.
- Check if permission validation occurs at runtime before every command execution, not just at declaration time.
- Examine whether tool permission state is safely serialized and cannot be tampered with.
- Search for Bash permission logic in SDK runtime code (`src/sdk/runtimes/claude.ts`), tool invocation handlers, and permission storage.

**Repository Context**: The Claude runtime explicitly sets `permissionMode: 'bypassPermissions'` and `disallowedTools: [...MUTATING_TOOLS]` (including 'Bash') for skill execution, blocking mutation tools at the SDK level. Changed code that alters this enforcement could introduce permission bypass.

### 3. Subprocess Argument and Environment Injection

Trace changed code that constructs subprocess arguments or environment variables from untrusted input.

- Identify whether argument injection can alter command behavior (e.g., adding flags like `--eval`, `--file`, `--exec`).
- Check if environment variables can be injected to influence subprocess behavior (PATH, LD_PRELOAD, NODE_OPTIONS).
- Examine whether arguments are safely quoted or passed as arrays to prevent injection.
- Search for `child_process.spawn` argument construction and environment variable handling in `src/utils/exec.ts` and related modules.

**Repository Context**: `buildSpawnOptions` in `src/utils/exec.ts` merges user-provided `env` options with `process.env` using spread syntax: `env: options?.env ? { ...process.env, ...options.env } : process.env`. If untrusted input controls `options.env`, it can override environment variables.

### 4. Process Output and Error Handling

Trace changed code that captures subprocess stdout, stderr, or exit codes.

- Identify whether subprocess output is validated before use in subsequent operations (rendering, caching, further command construction).
- Check if error messages from failed commands can leak sensitive information.
- Examine whether subprocess failure is handled safely without exposing stack traces or internal paths.
- Search for subprocess output handling in tool invocation and skill execution code.

**Repository Context**: `ExecError` in `src/utils/exec.ts` includes stderr in the error message and exposes it as a public readonly property. Changed code that logs or renders `ExecError` without sanitization could leak sensitive subprocess output.

### 5. Tool and Binary Execution from Untrusted Paths

Trace changed code that resolves tool binaries (git, npm, gh, tar, claude) from PATH or config-specified paths.

- Identify whether untrusted input can influence binary resolution to execute attacker-controlled binaries.
- Check if absolute paths or allowlists are used for critical tools.
- Examine whether binary signatures or hashes are verified before execution.
- Search for tool binary resolution in subprocess invocation (`src/utils/exec.ts`, `src/sdk/auth.ts`, `src/action/workflow/base.ts`) and external tool wrappers.

**Repository Context**: `findClaudeCodeExecutable` in `src/action/workflow/base.ts` checks `CLAUDE_CODE_PATH` environment variable, `~/.local/bin/claude`, then uses `which` command to find the binary on PATH. `verifyAuth` in `src/sdk/auth.ts` uses `execFileNonInteractive('claude', ['--version'])` without absolute path. If attacker can control PATH or `CLAUDE_CODE_PATH`, they may substitute a malicious binary.

## Out of Scope

- Generic recommendations to avoid shell spawning unrelated to changed code.
- Hardening suggestions for unchanged subprocess invocation paths.
- Dependency vulnerability reports unless the changed code introduces a new exploitable subprocess pattern.
- Command execution issues in unchanged code unless new data flow from changed lines triggers injection.
- Theoretical permission bypasses without concrete evidence from changed code.

## Output Requirements

For each finding, provide:

- The specific changed lines where untrusted input flows into command construction or process spawning without sanitization
- The untrusted input source (PR file path, config value, skill argument, user input)
- The vulnerable operation (shell command construction, spawn with shell, argument injection, environment injection, binary resolution)
- Concrete attack path showing how an attacker with control over the input can inject commands or bypass permission checks
- Realistic impact (arbitrary command execution, permission boundary bypass, sandbox escape, privilege escalation)
- Smallest safe fix (use execFile/spawn without shell, argument arrays, input validation, allowlist, absolute tool paths, runtime permission revalidation)

## Missing Context

The following context would improve finding precision but is not available during synthesis:

- Bash tool permission enforcement model: whether permissions are checked at declaration time, runtime, or both; whether permission state is persisted or ephemeral.
- Subprocess sandboxing: whether Warden subprocess execution is isolated (containers, seccomp, process namespaces) or runs with full repository access.
- Tool binary verification: whether critical tools (git, claude, npm) are verified via signatures, hashes, or trust-on-first-use before execution.
- Environment variable propagation policy: which environment variables are intentionally propagated to subprocesses vs. which should be filtered.

When evaluating changed code, explicitly note when missing context prevents conclusive determination of command execution risk.
