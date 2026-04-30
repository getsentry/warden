# authorization-trust-boundaries Specification

## Intent

This child skill detects authorization failures, privilege escalation, and trust boundary violations in changed TypeScript code within Warden's runtime, CLI, SDK, GitHub Action integration, skill loading, and tool permission enforcement.

It is a focused decomposition of the parent "security-review" Superwarden skill, generated through an independent synthesis pass with repo-local source inspection and public prior-art research.

## Scope

**In scope**:
- Authorization checks, permission boundaries, trust-level enforcement, and access control logic in changed TypeScript files
- Data flow from untrusted sources (GitHub event payloads, repository files, remote skill definitions, user-supplied config, environment variables) through permission checks to sensitive operations (filesystem writes, command execution, credential access, skill loading, tool invocation)
- Missing, incomplete, or bypassable authorization checks across trust boundaries:
  - GitHub workflow inputs → privileged operations
  - Remote skills → permission sandbox escape
  - SDK callers → tool permission boundary bypass
  - Config loading → path traversal or privilege escalation
  - Skill loading → cache integrity or origin validation bypass
  - Tool execution → permission elevation through argument/environment manipulation
- Concrete exploitability with realistic attacker capabilities (PR author, workflow caller, malicious skill author)
- Current Node.js security guidance, GitHub Actions hardening, and OWASP authorization patterns

**Out of scope**:
- Generic hardening without concrete bypass paths
- Authorization issues in unchanged code unless new exploitability is introduced
- Attacks requiring unrealistic control of trusted local developer machines
- Code style, architecture preferences, or speculative future risks
- Dependency freshness without changed-code exploit paths

## Users And Trigger Context

This child skill is invoked by:
- Warden's Superwarden coordinator when executing the "security-review" parent skill
- Direct execution via `warden <files> --skill .warden/superwarden/security-review/cache/<plan-hash>/skills/authorization-trust-boundaries`

It runs against changed TypeScript files in a pull request, local diff, or scheduled analysis.

## Runtime Contract

- **Input**: Changed TypeScript files from Warden's diff processing pipeline
- **Tools**: Read-only access to Read, Grep, Glob, WebFetch, WebSearch (configured by parent runtime)
- **Output**: Warden findings in normal JSONL schema with changed-line anchoring
- **No findings**: When evidence is insufficient, return empty findings array (do not invent placeholder findings)
- **External research**: Public framework/API/vulnerability names only; no repository code, secrets, or private paths sent to web tools

## Source And Evidence Model

**Authoritative local sources**:
- `src/sdk/runtimes/claude.ts`: Tool permission enforcement (`allowedTools`, `disallowedTools`, `permissionMode: 'bypassPermissions'`)
- `src/skills/remote.ts`: Remote skill parsing (`parseRemoteRef`), git command construction, origin validation, path traversal prevention
- `src/action/inputs.ts`: GitHub Action input parsing, token type detection, environment variable setup
- `src/config/loader.ts`: Config file loading, layered config merge, path resolution
- `src/coordinator/plan.ts`: Superwarden synthesis prompt construction, source hash validation, cache path resolution
- `src/utils/exec.ts`: Command execution wrappers (`execGitNonInteractive`, `execFileNonInteractive`)

**Useful external sources**:
- Node.js child_process security documentation (spawn vs exec, argument arrays, shell injection prevention)
- Node.js permission model (--allow-child-process, --allow-fs-read, --allow-fs-write)
- GitHub Actions security hardening (input validation, expression injection, untrusted event payload handling)
- OWASP Authorization Cheat Sheet (trust boundaries, privilege escalation patterns, server-side enforcement)

**Data that must not be stored or transmitted**:
- Repository source code excerpts (use public API/framework patterns only)
- Secrets, credentials, API keys, tokens
- Private file paths (use generic examples like `/path/to/file` instead of actual repo paths)
- Proprietary Warden deployment details

## Reference Architecture

### Trust Boundaries in Warden

1. **CLI vs GitHub Action**:
   - CLI: Local developer machine, trusted user, full filesystem/network access
   - Action: GitHub-hosted runner, untrusted PR author can control event payloads, restricted environment

2. **Local vs Remote Skills**:
   - Local: Bundled with repository, trusted maintainer control
   - Remote: Fetched from GitHub repositories, untrusted author, must be sandboxed

3. **User vs System Config**:
   - User: `warden.toml`, action inputs, environment variables (potentially attacker-controlled)
   - System: Warden runtime defaults, SDK hardcoded tool lists, framework behavior

4. **Skill Sandbox vs Host Runtime**:
   - Sandbox: Read-only tools (Read, Grep, Glob, optionally WebFetch/WebSearch), `permissionMode: 'bypassPermissions'` but explicit tool denylist
   - Host: Full filesystem/command execution access for Warden's own operations

5. **Repository Content vs GitHub Event Metadata**:
   - Repository: Files checked into Git, subject to code review
   - Event: PR titles, branch names, issue bodies, labels (untrusted, can contain injection payloads)

### Authorization Control Points

- **Tool Permission**: `resolveClaudeSkillTools()` in `src/sdk/runtimes/claude.ts` filters allowed/denied tools; `READ_ONLY_TOOLS` vs `MUTATING_TOOLS` separation
- **Remote Skill Validation**: `parseRemoteRef()` in `src/skills/remote.ts` validates owner/repo/SHA format, prevents flag injection (starts with `-`), blocks path traversal (`..`)
- **Config Path Resolution**: `loadLayeredWardenConfig()` normalizes paths, validates `base-config-path` ≠ `config-path`
- **Git Command Safety**: `execGitNonInteractive()` uses `--` separator and non-interactive mode; `parseRemoteRef()` validates arguments before constructing git commands
- **Action Input Validation**: `validateInputs()` checks required fields; `setupAuthEnv()` clears env vars before setting auth tokens

## Evaluation

**Lightweight validation**:
- Run `warden <changed-files> --skill .warden/superwarden/security-review/cache/<plan-hash>/skills/authorization-trust-boundaries` and confirm:
  - Output is valid Warden JSONL findings
  - Findings include changed-line anchors
  - No findings when no authorization issues exist in changed code

**Behavioral validation**:
- Introduce a test commit removing a `parseRemoteRef()` validation check; confirm skill detects the authorization bypass
- Introduce a commit allowing user-controlled `cwd` in `execGitNonInteractive()`; confirm skill reports privilege escalation risk
- Test against unchanged code; confirm no false positives

**Acceptance gates**:
- Changed-line anchoring present in all findings
- Concrete attack path and realistic impact described
- Trust boundary violation explicitly identified (CLI vs Action, local vs remote, etc.)
- Smallest safe fix provided with code guidance
- No speculative findings when evidence is incomplete

## Known Limitations

- **Caller context inference**: When a function accepts a path/command argument, the skill may not always determine whether the caller passes trusted vs untrusted data without full call-graph analysis. In such cases, the skill should withhold findings rather than report speculative risks.
- **Deployment configuration**: The skill cannot know whether Warden runs in a restricted GitHub Actions environment or a developer's unrestricted local machine. Findings should state assumptions ("if deployed in GitHub Actions" or "when processing untrusted PR input").
- **Dynamic permission model**: Node.js permission flags (`--allow-child-process`) are runtime configuration, not statically analyzable from code. The skill documents best practices but cannot enforce them.
- **External API behavior**: The skill relies on public documentation for Node.js, GitHub Actions, and Git behavior. If documentation is outdated or incomplete, findings may miss edge cases.

## Maintenance Notes

- **Regenerate after parent changes**: When the "security-review" parent skill's `SKILL.md`, `SPEC.md`, or `SOURCES.md` changes, regenerate this child skill to preserve alignment.
- **Update for new trust boundaries**: If Warden adds new execution contexts (e.g., browser extension, VS Code plugin), update this skill's scope and trust boundary enumeration.
- **Sync with runtime changes**: When `src/sdk/runtimes/` adds new tool permission mechanisms, update investigation instructions to cover the new control points.
- **Validate external source currency**: Periodically verify that referenced Node.js, GitHub Actions, and OWASP guidance URLs are current and correct for 2026 security landscape.
- **Preserve skill-writer quality bar**: This skill must maintain vulnerability prerequisites, exploitable dataflow examples, false-positive controls, severity/confidence calibration, concrete remediation patterns, and framework/runtime caveats per skill-writer standards.
