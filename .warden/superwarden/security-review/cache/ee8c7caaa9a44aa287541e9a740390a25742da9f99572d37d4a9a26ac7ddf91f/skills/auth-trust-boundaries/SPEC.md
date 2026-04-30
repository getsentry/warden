# security-review-auth-trust-boundaries Specification

## Intent

This is a Superwarden child skill synthesized from parent **security-review** task **auth-trust-boundaries**.

It detects authorization bypass and trust boundary violations in changed TypeScript code where untrusted input crosses security boundaries without proper validation or privilege checks in Warden's codebase.

## Scope

In scope:

- Skill loading and execution trust boundaries where untrusted repository input can influence skill selection, cache keys, or execution parameters
- GitHub event and workflow data handling where untrusted fork PR data can influence privileged operations
- Configuration and permission boundaries where untrusted repository files can escalate tool permissions or modify security settings
- Output rendering and injection where untrusted content can inject GitHub Actions workflow commands
- Remote skill URL parsing, git command construction, and marketplace.json path traversal prevention
- TypeScript type cast authorization bypass patterns
- Runtime privilege checks and validation enforcement

Out of scope:

- Generic code style unrelated to trust boundaries
- Speculative hardening without concrete attack paths from changed code
- Dependency freshness reports without new exploitable call paths
- Threats requiring unrealistic control of trusted local machines
- Authorization issues in unchanged code unless triggered by new data flow

## Trust Boundary Patterns in Warden

### Skill Loading Trust Boundaries

**Remote skill resolution** (`src/skills/remote.ts`):
- `parseRemoteRef` validates owner/repo format and prevents git flag injection by rejecting values starting with `-`
- `parseRemoteRef` prevents path traversal via `..` using safe name pattern: `/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/`
- `execGit` uses `--` separator to prevent flag injection in git commands
- `fetchRemote` upgrades `http://` to `https://` to prevent plain HTTP cloning
- Marketplace plugin source paths are validated using `resolve()` and prefix check to prevent path traversal

**Local skill resolution** (`src/skills/loader.ts`):
- Conventional directories checked in priority order: `.agents/skills`, `.claude/skills`, `.warden/superwarden`, `.warden/skills`
- `resolveSkillPath` handles tilde expansion and absolute/relative path resolution
- Skill cache uses skill name → LoadedSkill map with entry path tracking

**Child skill synthesis** (`src/coordinator/child-skills.ts`):
- Child skills are synthesized by LLM agent with structured JSON output
- Generated artifacts stored under `.warden/superwarden/<plan-hash>/skills/<task-id>/`
- Cache integrity validated through task hash, source hash, coordinator version, and byte length comparison
- Skill name uses `safePathSegment` to prevent path traversal: `value.replace(/[^a-zA-Z0-9._-]/g, '-')`

### Configuration Trust Boundaries

**Config loading** (`src/config/loader.ts`):
- Base config vs repo config layering enforces separation
- `loadLayeredWardenConfig` validates base-config-path and config-path point to different files
- Schema validation via Zod enforces field types and structure
- Skill roots are validated with `existsSync` check
- `emptyToUndefined` treats empty string as "not set" for GitHub Actions secret substitution

**Skill configuration** (`src/config/schema.ts`):
- `skill.remote` is optional string for remote repository reference
- `skill.mode` can be "direct" or "coordinator" (Superwarden execution)
- Tool permissions defined via `ToolConfigSchema` with allowed/denied arrays
- Model, maxTurns, runtime settings have three-level merge: trigger > skill > defaults

### GitHub Event Trust Boundaries

**CLI main entry** (`src/cli/main.ts`):
- Loads .env and .env.local files for environment variables
- Creates Reporter from CLI options with TTY detection
- Builds local event context from git state
- Resolves skill configs with layered base/repo config support
- No direct GitHub webhook payload processing in current codebase (Action entrypoint not examined)

### Output Rendering Trust Boundaries

**Formatters** (`src/cli/output/formatters.ts`):
- `formatFindingCompact` uses chalk for terminal coloring (no HTML/markdown escaping)
- `formatStatsCompact` formats duration, tokens, cost without user-controlled input
- No evidence of GitHub Actions workflow command sanitization (::set-output, ::add-mask)
- File paths and finding titles rendered directly without escaping

## Evidence Requirements

**Changed-line anchoring**: Each finding must cite specific changed line numbers where untrusted input crosses a trust boundary.

**Data-flow trace**: Provide concrete trace from untrusted input source to privileged operation.

**Repository source reference**: Cite existing patterns in loader.ts, config/loader.ts, remote.ts, formatters.ts, child-skills.ts.

**Public documentation citation**: Reference GitHub Actions security, Node.js security, TypeScript authorization patterns when behavior affects exploitability.

**Attack scenario**: Describe realistic attack with attacker control over input source.

**Safe fix**: Smallest concrete validation or isolation approach.

**Empty findings when insufficient**: Do not report speculative findings without concrete evidence from changed code.

## Framework-Specific Trust Boundary Guidance

### GitHub Actions Event Triggers

**pull_request vs pull_request_target** ([GitHub Security Lab](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)):
- `pull_request`: Runs in fork context, no write permissions, no secrets access
- `pull_request_target`: Runs in base context, write permissions, secrets exposed
- Combining `pull_request_target` with checkout of untrusted PR is dangerous
- GITHUB_REF for `pull_request_target` resolves to default branch (2025 update)

**Workflow command injection** ([GitHub Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)):
- `::set-output` deprecated in favor of `GITHUB_OUTPUT`
- `::add-mask` must be called before logging sensitive data
- `::stop-commands` can disable masking if attacker controls logged variables
- User-controlled content in workflow logs can inject workflow commands

### TypeScript Authorization Patterns

**Type casting bypass** ([fsjs.dev](https://fsjs.dev/vulnerabilities-in-convenience-typescript-hacks/)):
- Unsafe type casts bypass exhaustiveness and narrowing checks
- Casting untrusted data as privileged type (e.g., Admin) compromises authorization
- Safe pattern: TypeScript for internal guarantees, runtime validation for trust boundaries
- Avoid relying on casts for authorization checks, use server-side logic

### Node.js Path Traversal and Command Injection

**Path traversal prevention**:
- Validate canonical paths with `fs.realpath` or `resolve()` + prefix check
- Reject `..`, absolute paths, drive-relative paths in user input
- Use allowlist for safe characters in file/directory names

**Command injection prevention**:
- Use `--` separator in command arguments to prevent flag injection
- Reject arguments starting with `-`
- Use argument arrays instead of shell strings
- Avoid `shell: true` in `child_process.spawn`
