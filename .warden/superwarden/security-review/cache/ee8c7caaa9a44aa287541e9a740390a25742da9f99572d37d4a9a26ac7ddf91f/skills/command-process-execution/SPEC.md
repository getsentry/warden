# security-review-command-process-execution Child Skill Specification

## Intent

This is a Superwarden child skill synthesized from the **security-review** parent skill for the **command-process-execution** task.

It detects command injection, unsafe process spawning, tool permission bypass, subprocess argument/environment injection, and binary resolution vulnerabilities in changed TypeScript code affecting Warden's Bash tool invocation, subprocess communication, and external tool execution.

## Scope

### In Scope

- Command injection via `child_process.exec`, `child_process.spawn` with `shell: true`, or shell command string construction from untrusted input (PR file paths, config values, skill arguments, user input, repository metadata).
- Bash tool permission boundary bypass through alternate code paths, cached approvals without revalidation, or permission enforcement manipulation.
- Subprocess argument injection altering command behavior (flag injection like `--eval`, `--file`, `--exec`).
- Subprocess environment variable injection influencing process behavior (PATH, LD_PRELOAD, NODE_OPTIONS).
- Tool binary resolution from untrusted paths enabling execution of attacker-controlled binaries.
- Subprocess output leaking sensitive information through error messages, stack traces, or internal paths.
- Unsafe subprocess failure handling exposing diagnostic information.

### Out of Scope

- Generic command execution best practices unrelated to changed code.
- Hardening suggestions for unchanged subprocess invocation paths.
- Dependency vulnerability reports unless the changed code introduces a new exploitable subprocess pattern.
- Command execution issues in unchanged code unless new data flow from changed lines triggers injection.
- Theoretical permission bypasses without concrete evidence from changed code.
- Subprocess performance optimization unrelated to security.
- Subprocess timeout or resource exhaustion unless tied to command injection exploitation.

## Evidence Requirements

Every finding must include:

1. **Changed-Line Anchoring**: Specific changed line numbers where untrusted input flows into command construction or process spawning.

2. **Concrete Data-Flow Trace**: Complete trace from untrusted input source (PR file path, config value, skill argument, user input) to vulnerable subprocess operation (shell command construction, spawn with shell, argument injection, environment injection, binary resolution).

3. **Repository Source Evidence**: Reference to existing command execution patterns in:
   - `src/utils/exec.ts`: `execNonInteractive`, `execFileNonInteractive`, `execGitNonInteractive`
   - `src/sdk/runtimes/claude.ts`: Bash tool permission enforcement via `permissionMode: 'bypassPermissions'` and `disallowedTools`
   - `src/cli/git.ts`: Git command invocation using argument arrays
   - `src/action/workflow/base.ts`: Claude binary resolution via `findClaudeCodeExecutable`
   - `src/sdk/auth.ts`: Binary verification via `execFileNonInteractive('claude', ['--version'])`

4. **Public Documentation Reference** (when behavior affects the attack): Cite:
   - CVE-2024-27980: Node.js child_process batch file injection on Windows (April 2024)
   - CVE-2024-36138: Incomplete fix for CVE-2024-27980 (July 2024)
   - Node.js child_process security best practices: spawn vs exec, shell option risks, argument arrays
   - Environment variable subprocess inheritance and injection vectors

5. **Realistic Attack Scenario**: Concrete attack path showing attacker control over the untrusted input and exploitation mechanism.

6. **Realistic Impact**: Actual security consequence (arbitrary command execution, permission boundary bypass, sandbox escape, privilege escalation).

7. **Smallest Safe Fix**: Concrete remediation (use execFile/spawn without shell, argument arrays, input validation, allowlist, absolute tool paths, runtime permission revalidation).

## Repository Command Execution Patterns

### Safe Subprocess Invocation

**`src/utils/exec.ts`**:
- `execFileNonInteractive(file, args, options)`: Uses `spawnSync` without shell, passing arguments as an array. **Safe from command injection** when `file` and `args` are controlled.
- `execGitNonInteractive(args, options)`: Wraps `execFileNonInteractive('git', args)` with non-interactive environment variables. **Safe pattern** for git commands.
- `buildSpawnOptions(options)`: Merges `options.env` with `process.env`. **Vulnerable to environment injection** if `options.env` contains untrusted input.

**`src/cli/git.ts`**:
- All git commands use `execGitNonInteractive` with hardcoded argument arrays. **Safe pattern**.

**`src/cli/commands/setup-app/browser.ts`**:
- `openBrowser(url)`: Uses `execFile` (no shell) with URL in argument array. **Safe from command injection** but URL validation needed to prevent argument injection on Windows (`cmd /c start`).

### Unsafe Subprocess Invocation

**`src/utils/exec.ts`**:
- `execNonInteractive(command, options)`: Uses `spawnSync(command, { shell: true })`. **Vulnerable to command injection** if `command` contains untrusted input. This function exists for shell command execution but is dangerous if the command string is influenced by untrusted input.

### Permission Enforcement

**`src/sdk/runtimes/claude.ts`**:
- `runSkill`: Sets `permissionMode: 'bypassPermissions'` and explicitly disallows mutating tools (`Bash`, `Write`, `Edit`) via `disallowedTools`.
- Skill execution uses read-only tools only (`Read`, `Grep`, `Glob`, optionally `WebFetch`, `WebSearch`).
- Changed code that alters `disallowedTools`, `permissionMode`, or tool filtering could introduce permission bypass.

### Binary Resolution

**`src/action/workflow/base.ts`**:
- `findClaudeCodeExecutable()`: Checks `CLAUDE_CODE_PATH` environment variable, then `~/.local/bin/claude`, then uses `which` command, then tries hardcoded paths. **Vulnerable to binary substitution** if attacker controls `CLAUDE_CODE_PATH` or PATH.

**`src/sdk/auth.ts`**:
- `verifyAuth()`: Uses `execFileNonInteractive('claude', ['--version'])` without absolute path. **Relies on PATH resolution**. Safe if PATH is trusted, but vulnerable if attacker can prepend to PATH.

## Node.js Command Injection Context

### CVE-2024-27980 (April 2024)

**Summary**: Command injection via args parameter of `child_process.spawn` without shell option enabled on Windows.

**Impact**: Due to improper handling of batch files in `child_process.spawn` / `child_process.spawnSync`, a malicious command line argument can inject arbitrary commands and achieve code execution even if the shell option is not enabled.

**Affected Platforms**: Windows only.

**Affected Versions**: All active release lines (18.x, 20.x, 21.x) before the April 2024 security release.

**Remediation**: Upgrade to patched Node.js versions. Avoid using `child_process.spawn` and `child_process.spawnSync` with untrusted input. Sanitize and validate command line arguments.

**Follow-up**: CVE-2024-36138 (July 2024) identified an incomplete fix for CVE-2024-27980, demonstrating continued risk in Windows batch file handling.

### Safe Spawning Best Practices (2026)

1. **Avoid `child_process.exec()`**: Executes a shell command and is vulnerable to injection if user input is included in the command string.

2. **Use `execFile()` or `spawn()` without shell**: Require arguments as an array, preventing command injection. `execFile` executes a specific binary file without shell interpretation.

3. **Use argument arrays, not string concatenation**: Prevents injection of shell metacharacters or additional arguments.

4. **Use double dash (`--`) to signal end of options**: Prevents attackers from injecting flags that alter command behavior.

5. **Validate and sanitize user input**: Use regex or allowlists to restrict inputs to known-good values.

6. **Override environment variables carefully**: Prevent leaking sensitive information from parent process environment. Avoid allowing untrusted input to control environment variables.

7. **Windows-specific concerns**: Even without shell option, batch file handling can enable injection on Windows (CVE-2024-27980, CVE-2024-36138).

## Missing Context

The following context would improve finding precision:

- **Bash tool permission enforcement model**: Whether permissions are checked at declaration time, runtime, or both. Whether permission state is persisted or ephemeral. How `permissionMode: 'bypassPermissions'` affects runtime behavior.

- **Subprocess sandboxing**: Whether Warden subprocess execution is isolated (containers, seccomp, process namespaces) or runs with full repository access. Whether child processes inherit parent privileges.

- **Tool binary verification**: Whether critical tools (git, claude, npm) are verified via signatures, hashes, or trust-on-first-use before execution.

- **Environment variable propagation policy**: Which environment variables are intentionally propagated to subprocesses vs. which should be filtered. Whether `GIT_NON_INTERACTIVE_ENV` is the only environment override or if others exist.

- **PATH trust model**: Whether PATH is considered trusted (e.g., set by CI environment) or untrusted (e.g., influenced by repository config).

When evaluating changed code, explicitly note when missing context prevents conclusive determination of command execution risk. Do not invent facts or assume security properties without evidence.

## Reporting Contract

For each finding:

- Anchor to specific changed line numbers.
- Trace data flow from untrusted input to vulnerable operation.
- Reference repository command execution patterns showing deviation.
- Cite CVE-2024-27980, CVE-2024-36138, or Node.js best practices when behavior affects the attack.
- Provide concrete attack path with attacker control assumption.
- State realistic impact.
- Describe smallest safe fix.

When evidence is insufficient, state the missing context and return an empty findings array. Do not report speculative findings.
