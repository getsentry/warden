# authorization-trust-boundaries Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
| --- | --- | --- | --- | --- |
| Parent Superwarden plan (`7e30679d8e24fef89948e33a65549cf372e9d84294f78ab317ed9769afe64fcd.json`) | canonical | high | Task scope, prompt, evidence requirements, out-of-scope exclusions | Do not modify task contract; regenerate child skill if parent plan changes |
| `src/sdk/runtimes/claude.ts` | canonical | high | Tool permission enforcement (`allowedTools`, `disallowedTools`, `permissionMode`), read-only vs mutating tool separation | Inspect actual runtime code for permission boundaries |
| `src/skills/remote.ts` | canonical | high | Remote skill parsing, origin validation, cache integrity, git command construction, path traversal prevention | Inspect for input validation and command injection vectors |
| `src/action/inputs.ts` | canonical | high | GitHub Action input parsing, token type detection, environment variable setup | Inspect for untrusted input flow to system operations |
| `src/config/loader.ts` | canonical | high | Config file loading, layered merge, path resolution, validation | Inspect for path traversal and config injection risks |
| `src/coordinator/plan.ts` | canonical | high | Superwarden synthesis authorization, source hash validation, cache path resolution | Inspect for synthesis-time authorization bypasses |
| Node.js Permissions Documentation | external | medium | Permission model (`--allow-child-process`, `--allow-fs-*`), child_process security best practices | Use for runtime behavior expectations; do not send repo code |
| GitHub Actions Security Hardening Guide | external | high | Workflow input validation, expression injection prevention, untrusted event payload handling | Use for GitHub Actions trust boundary patterns; do not send repo code |
| OWASP Authorization Cheat Sheet | external | high | Trust boundary definition, privilege escalation patterns (vertical vs horizontal), server-side enforcement requirements | Use for authorization bypass patterns; do not send repo code |

## Decisions

### Trust Boundary Enumeration

**Decision**: Enumerate five primary trust boundaries: (1) CLI vs GitHub Action, (2) local vs remote skills, (3) user vs system config, (4) skill sandbox vs host runtime, (5) repository content vs GitHub event metadata.

**Evidence**:
- `src/action/inputs.ts` distinguishes GitHub Action environment (`INPUT_*` env vars) from CLI execution
- `src/skills/remote.ts` treats remote skill URLs as untrusted, applies origin validation and path traversal checks
- `src/config/loader.ts` merges base config (org-wide, potentially trusted) with repo config (user-controlled)
- `src/sdk/runtimes/claude.ts` enforces tool allowlist/denylist to sandbox skill execution
- GitHub Actions security guidance emphasizes untrusted event payloads (PR titles, branch names) vs trusted repository state

### Tool Permission Enforcement

**Decision**: `READ_ONLY_TOOLS` (Read, Grep, Glob, WebFetch, WebSearch) are default-allowed; `MUTATING_TOOLS` (Write, Edit, Bash) and `CLAUDE_AGENT_TOOLS` (Task, TodoWrite) are default-denied via `disallowedTools` array.

**Evidence**: `src/sdk/runtimes/claude.ts:51-54, 77-89` defines tool categories and applies filtering in `resolveClaudeSkillTools()`.

**Rationale**: Skills should not modify the repository or execute arbitrary commands by default. Defense-in-depth: even if a skill's `ToolConfig.allowed` is manipulated, `disallowedTools` blocks mutation.

### Remote Skill Origin Validation

**Decision**: `parseRemoteRef()` validates owner/repo/SHA format, rejects values starting with `-` (git flag injection), blocks path traversal characters (`..`), and enforces safe GitHub username/repo patterns (`/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/`).

**Evidence**: `src/skills/remote.ts:143-161` validates remote ref components before use in git commands.

**Rationale**: Prevents command injection via `git clone/fetch` arguments and path traversal during cache storage.

### GitHub Action Input Handling

**Decision**: Action inputs (`anthropic-api-key`, `base-config-path`, `config-path`, `github-token`) are read from `INPUT_*` environment variables without additional validation beyond required-field checks.

**Evidence**: `src/action/inputs.ts:46-54, 70-115` reads inputs using `getInput()` and validates presence in `validateInputs()`.

**Gap**: No path traversal or injection validation on `base-config-path`/`config-path` inputs. Relies on downstream `loadLayeredWardenConfig()` to normalize paths.

### Config Path Resolution

**Decision**: `loadLayeredWardenConfig()` uses `path.join()` and `path.normalize()` to resolve config paths, validates `base-config-path` ≠ `config-path`, and checks file existence before loading.

**Evidence**: `src/config/loader.ts:220-249` normalizes and validates config paths.

**Limitation**: `path.join()` does not prevent traversal outside `repoPath` when `baseConfigPath` contains `..`. Resolved path starts with `repoPath` check is missing.

### Git Command Safety

**Decision**: `execGitNonInteractive()` sets `GIT_TERMINAL_PROMPT=0` to prevent interactive auth prompts and uses `execFileNonInteractive()` for subprocess spawning. `parseRemoteRef()` validates arguments before construction.

**Evidence**:
- `src/utils/exec.ts` (referenced but not read in this synthesis; inferred from `src/skills/remote.ts:306-313`)
- `src/skills/remote.ts:372-386` uses `--` separator in git commands to prevent flag injection

**Rationale**: Non-interactive mode prevents credential prompts that could leak secrets. Argument validation prevents injection.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
| --- | --- | --- |
| Vulnerability prerequisites | complete | Task requires concrete data-flow trace from untrusted source to sensitive operation |
| Exploitable dataflow examples | complete | Task enumerates GitHub event payloads, repository files, remote skill URLs, user config, env vars → filesystem, command exec, credential access |
| False-positive controls | complete | Task requires changed-line anchoring, realistic attacker capabilities, sufficient evidence; withholds findings when caller context is unclear |
| Severity/confidence calibration | partial | Task describes realistic impact (arbitrary file read/write, command execution, privilege escalation) but does not map to CVSS or Warden severity levels |
| Remediation patterns | complete | Task requires "smallest safe fix with concrete code guidance anchored to changed lines" |
| Framework/runtime caveats | complete | Task references Node.js permission model, GitHub Actions environment restrictions, Git command behavior |
| API surface | complete | Covers `parseRemoteRef()`, `resolveClaudeSkillTools()`, `loadLayeredWardenConfig()`, `execGitNonInteractive()`, `parseActionInputs()` |
| Config/runtime options | complete | Covers `allowedTools`, `disallowedTools`, `permissionMode`, `base-config-path`, `config-path`, `INPUT_*` env vars |
| Common use cases | complete | GitHub Action workflow with untrusted PR, remote skill loading, layered org/repo config, CLI execution |
| Known issues/workarounds | complete | Caller context inference limitation, deployment config unknowns, dynamic permission flags |
| Version/migration variance | partial | Current as of 2026 Node.js/GitHub Actions guidance; older Warden code may predate current patterns |

## Open Gaps

### Missing Path Traversal Check in Config Loading

**Gap**: `loadLayeredWardenConfig()` in `src/config/loader.ts:220-249` uses `path.join(repoPath, options.baseConfigPath)` without verifying the resolved path starts with `repoPath`. If `baseConfigPath` is `../../../../etc/passwd`, the config loader may read files outside the repository.

**Validation step**: Inspect `src/config/loader.ts` for `resolve()` and `startsWith()` checks on `baseConfigPath` and `configPath` after normalization.

**Severity**: High if `base-config-path` is a GitHub Action input (untrusted PR author can set it); low if only trusted maintainers set it.

### Skill Tool Config Override

**Gap**: If a remote skill's `SKILL.md` frontmatter or skill definition can override `ToolConfig.allowed`/`ToolConfig.denied`, and `resolveClaudeSkillTools()` trusts that config, an attacker-controlled skill could enable `Bash` or `Write` tools.

**Validation step**: Inspect `src/skills/loader.ts` (not read in this synthesis) for how `ToolConfig` is parsed from skill files and whether it merges with or overrides runtime defaults.

**Severity**: Critical if remote skills can self-authorize mutation tools; mitigated by `disallowedTools` defense-in-depth.

### GitHub Event Payload Injection

**Gap**: Current synthesis did not inspect how GitHub event payloads (PR title, branch name, issue body) flow into Warden's execution. If these are interpolated into shell commands or file paths without sanitization, they are injection vectors.

**Next step**: Grep for `github.event`, `GITHUB_EVENT_PATH`, or Octokit usage in `src/action/**/*.ts` and trace payload fields to command construction or filesystem operations.

**Guidance**: GitHub Actions hardening recommends intermediate environment variables for untrusted event data, not direct shell interpolation.

### Superwarden Synthesis Prompt Injection

**Gap**: `buildSynthesisPrompt()` in `src/coordinator/plan.ts:320-396` includes skill description and source file content directly in the prompt. If an attacker controls a skill's `SKILL.md` or `SPEC.md` (e.g., via malicious remote skill), they could inject prompt instructions to manipulate synthesis output.

**Validation step**: Inspect whether synthesis uses delimiters, escaping, or tool-use boundaries to separate instructions from user-controlled content.

**Severity**: Medium; affects Superwarden plan generation, not runtime execution.

## Changelog

**2026-04-30**: Initial synthesis for Superwarden parent "security-review", task "authorization-trust-boundaries".
- Inspected local sources: `src/sdk/runtimes/claude.ts`, `src/skills/remote.ts`, `src/action/inputs.ts`, `src/config/loader.ts`, `src/coordinator/plan.ts`
- Researched external sources: Node.js Permissions (2026), GitHub Actions Security Hardening (2026), OWASP Authorization Cheat Sheet
- Enumerated trust boundaries: CLI vs Action, local vs remote skills, user vs system config, skill sandbox vs host runtime, repository vs event metadata
- Identified control points: tool permission filtering, remote skill validation, config path resolution, git command safety, action input handling
- Documented gaps: path traversal in config loading, skill tool config override, GitHub event payload injection, synthesis prompt injection
- Preserved skill-writer quality bar: vulnerability prerequisites, exploitable dataflow, false-positive controls, remediation patterns, framework caveats
