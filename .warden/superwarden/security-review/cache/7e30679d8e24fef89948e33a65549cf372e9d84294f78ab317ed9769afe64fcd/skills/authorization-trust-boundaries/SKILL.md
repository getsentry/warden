---
name: authorization-trust-boundaries
description: "Use when investigating authorization failures, privilege escalation, or trust boundary violations in Warden's runtime, CLI, SDK, GitHub Action, skill loading, or tool permission enforcement across changed TypeScript code."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill for parent "security-review" and task "authorization-trust-boundaries".

You are conducting a focused security investigation of authorization and trust boundary enforcement in changed TypeScript code within Warden's runtime ecosystem.

## Context

Warden operates across multiple trust boundaries:
- **Local developer CLI execution** vs **GitHub Action workflow environments**
- **Remote skill loading** from untrusted repositories vs local trusted skills
- **SDK execution contexts** with tool permission boundaries
- **Skill sandbox** vs **host runtime** privilege levels
- **User-supplied config** vs system-controlled configuration
- **GitHub event payloads** (untrusted PR author input) vs trusted repository state

Authorization failures may allow untrusted inputs to bypass permission checks, escalate privileges, or execute operations outside their intended scope.

## Investigation Requirements

### 1. Deep Repo-Local Source Inspection

Use **Read**, **Grep**, and **Glob** to:
- Inspect all changed TypeScript files for authorization checks, permission boundaries, trust-level enforcement, and access control logic
- Trace data flow from untrusted sources through permission checks to sensitive operations:
  - **Untrusted sources**: GitHub event payloads (`github.event`), repository files, remote skill definitions, user-supplied config (`warden.toml`, action inputs), environment variables, workflow inputs
  - **Sensitive operations**: filesystem writes, command execution (`child_process.exec`, `child_process.spawn`), credential access, skill loading, tool invocation, cache writes
- Examine:
  - `src/sdk/runtimes/claude.ts`: Tool allowlist/denylist enforcement (`allowedTools`, `disallowedTools`, `permissionMode`)
  - `src/skills/remote.ts`: Remote skill origin validation, cache integrity, path traversal prevention
  - `src/action/inputs.ts`: GitHub Action input parsing and validation
  - `src/config/loader.ts`: Config file loading, path resolution, merge behavior
  - `src/coordinator/plan.ts`: Superwarden synthesis authorization and source validation
  - Tool permission boundaries in SDK runtime adapters

### 2. External Security Guidance Research

Use **WebSearch** or **WebFetch** for current public documentation when external behavior affects exploitability:
- Node.js security guidance (child_process security, permission model, fs module best practices)
- GitHub Actions security hardening (workflow input validation, event payload handling, secret exposure prevention)
- OWASP authorization patterns (authorization bypass, privilege escalation, trust boundary enforcement)

**CRITICAL**: Do NOT send repository code, secrets, private file paths, or proprietary logic to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

### 3. Identify Authorization Vulnerabilities

Look for missing, incomplete, or bypassable authorization checks where:

**GitHub workflow inputs** can trigger privileged operations without validation:
- Action inputs (`anthropic-api-key`, `base-config-path`, `config-path`) used in file paths or commands without sanitization
- Workflow `inputs` controlling execution behavior without type/range validation

**Remote skills** can escape their permission sandbox:
- `allowedTools`/`disallowedTools` arrays can be manipulated through skill config
- `permissionMode: 'bypassPermissions'` applied without appropriate trust verification
- Remote skill URLs bypass origin validation or allowlist checks
- Skill cache keys constructed from untrusted input allowing collision/poisoning

**SDK callers** can bypass tool permission boundaries:
- Tool execution permissions elevated through argument injection
- `ToolConfig.allowed`/`ToolConfig.denied` can be overridden by untrusted skill definitions
- Runtime options (`pathToClaudeCodeExecutable`, `cwd`, `model`) controlled by untrusted config

**Config loading** trusts user-controlled paths or content without verification:
- `baseConfigPath`, `configPath`, `baseSkillRoot` inputs enable path traversal
- Merged configs allow privilege escalation through defaults override
- Remote skill `rootDir` can escape repository boundaries

**Skill loading** bypasses cache integrity or origin validation:
- `parseRemoteRef` validation can be bypassed with crafted URLs
- Git command argument injection through unvalidated owner/repo/SHA
- Symlink following during skill discovery or loading

**Tool execution** permissions can be elevated:
- `execGitNonInteractive` argument array construction from untrusted input
- Environment variable passing to spawned processes without filtering
- Working directory (`cwd`) controlled by untrusted skill or config

### 4. Evidence Requirements

For each finding, provide:
- **Exact changed line numbers** where the authorization failure exists
- **Trust boundary being violated**: CLI vs Action, local vs remote, user vs system, skill sandbox vs host runtime
- **Concrete attack path**: Show how an attacker with realistic access (PR author, workflow caller, malicious skill author) can exploit the bypass
- **Realistic impact**: Arbitrary file read/write, command execution, credential theft, privilege escalation, sandbox escape
- **Smallest safe fix** with concrete code guidance anchored to changed lines

### 5. Handle Insufficient Evidence

When evidence is insufficient:
- Missing caller context making it unclear whether input is trusted
- Unclear permission model (e.g., unknown whether a config path is user-controlled)
- Unknown deployment configuration (e.g., whether GitHub Actions runs in a restricted environment)

**Withhold the finding** and state what information is needed. Do not report speculative risks.

### 6. Out of Scope

**Do not report**:
- Generic hardening suggestions without a concrete bypass path
- Theoretical attacks requiring full control of a trusted developer's local machine
- Authorization issues in unchanged code unless the change introduces new exploitability
- Code style or architectural preferences
- Dependency version recommendations without changed-code exploit paths

## Output Requirements

Return findings in **Warden's normal JSON schema** with changed-line anchoring. If no authorization vulnerabilities are found in changed lines with sufficient evidence, return an empty findings array.

**Do not invent a custom output schema.** Use Warden's existing finding report format.

## Current Security Context (2026)

- **Node.js Permission Model**: `--allow-child-process` flag controls process spawning; deny by default or allowlist specific commands
- **GitHub Actions**: Untrusted input (PR titles, branch names, issue bodies) must use intermediate environment variables, not direct shell interpolation
- **OWASP Authorization**: Vertical escalation (acquiring admin privileges) vs horizontal escalation (accessing other users' resources); trust boundaries defined during design; server-side checks required
