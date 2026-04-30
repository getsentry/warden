# security-review-remote-skill-repository-input Child Skill Specification

## Intent

This is a Superwarden child skill synthesized from the parent **security-review** Superwarden skill for task **remote-skill-repository-input**.

It focuses exclusively on remote skill loading and untrusted repository input vulnerabilities in changed TypeScript code affecting Warden's skill loading, caching, and execution.

## Scope

In scope:

- Remote skill fetching and cache integrity vulnerabilities in changed code
- Skill provenance verification bypass and trust-on-first-use race conditions
- Untrusted repository input (PR metadata, workflow inputs, config values, branch names, file paths) influencing skill selection, execution parameters, or cache keys without validation
- Skill execution isolation, sandboxing, and permission boundary violations
- Dependency confusion, substitution attacks, and supply chain integrity failures in skill dependency resolution
- Changed code in `src/skills/loader.ts`, `src/skills/remote.ts`, `src/coordinator/child-skills.ts`, `src/config/loader.ts`, `src/coordinator/agentic.ts`, `src/sdk/analyze.ts`, GitHub Action entrypoints, PR metadata handlers, and skill selection logic

Out of scope:

- Generic supply chain hardening unrelated to changed skill loading code
- Recommendations to use different skill distribution mechanisms unless the changed code introduces a new insecure pattern
- Dependency vulnerability reports unless the changed code introduces a new exploitable skill loading path
- Remote skill issues in unchanged code unless new data flow from changed lines triggers the vulnerability
- Theoretical cache poisoning without evidence that changed code affects cache integrity

## Key Vulnerability Patterns

### Remote Skill Fetching and Cache Integrity

**Attack Surface:**
- Remote skill URLs from config (`warden.toml` `skills.remote` field) processed without origin validation
- Cache keys influenced by untrusted input (config values, PR metadata, workflow inputs) enabling cache key collisions or overwrites
- Skill content fetched from attacker-controlled URLs via git clone, HTTP, or GitHub API without integrity verification (signatures, hashes, pinned versions)
- Cache write operations susceptible to race conditions or partial writes allowing cache poisoning

**Repository Evidence:**
- `src/skills/remote.ts`: `fetchRemote()` clones repositories via git without verifying commit signatures (lines 319-423)
- `src/skills/remote.ts`: `parseRemoteRef()` validates owner/repo format but does not verify repository authenticity (lines 87-164)
- `src/skills/remote.ts`: `getRemotePath()` constructs cache paths from parsed ref without hash pinning for unpinned refs (lines 192-200)
- `src/skills/remote.ts`: `loadState()` and `saveState()` use JSON cache without cryptographic integrity verification (lines 213-251)
- `src/coordinator/child-skills.ts`: Child skill synthesis writes artifacts to cache without integrity metadata (lines 208-251)

**Current Behavior:**
- Warden supports remote skill loading via `warden.toml` `skills.remote` field (e.g., `remote: "owner/repo"` or `remote: "owner/repo@sha"`)
- Remote skills are cloned to `~/.local/warden/skills/owner/repo/` (or `WARDEN_STATE_DIR`) via git clone
- Unpinned refs (without `@sha`) are refreshed every 24 hours (configurable via `WARDEN_SKILL_CACHE_TTL`)
- Pinned refs (with `@sha`) are considered immutable and cached indefinitely
- No cryptographic signature verification or commit signature validation is performed
- Cache integrity relies on SHA stored in `state.json`, but SHA is not verified against a trusted source

### Skill Provenance and Trust-on-First-Use

**Attack Surface:**
- Trust-on-first-use patterns vulnerable to race conditions or cache poisoning on first fetch
- Skill source resolution can be downgraded from local to remote via config manipulation
- No publisher identity verification or skill signing mechanism
- Cache state (`state.json`) tracks SHA and fetchedAt but does not verify commit provenance

**Repository Evidence:**
- `src/skills/loader.ts`: `resolveSkillAsync()` prioritizes remote resolution when `options.remote` is set, then checks paths, then conventional directories (lines 426-485)
- `src/skills/remote.ts`: First fetch writes SHA to `state.json` without verifying the commit is from expected publisher (lines 411-420)
- `src/config/loader.ts`: Config loading passes `skill.remote` directly to resolution without provenance validation (lines 364, 390)

**Current Behavior:**
- Skill resolution order: remote (if `remote` option set) > direct path > conventional directories
- Remote skills use trust-on-first-use: first fetch stores SHA in `state.json`, subsequent fetches verify SHA matches
- No mechanism to verify repository ownership or commit signature before first fetch
- Config-specified remote URLs can override local skills with same name

### Untrusted Repository Input Handling

**Attack Surface:**
- PR title, body, commit messages, file paths, branch names from GitHub webhook payloads
- Workflow inputs from `workflow_dispatch` events
- Config values from repository `warden.toml` (untrusted in PR context)
- Input flowing into skill selection, execution parameters, cache keys, or output rendering without sanitization

**Repository Evidence:**
- GitHub Action workflow (`.github/workflows/warden.yml`) processes `pull_request` events with `types: [opened, synchronize, reopened]` (lines 9-10)
- `src/config/loader.ts`: Config loading from repository `warden.toml` processes `skills.remote`, `skills.paths`, `skills.ignorePaths` without validation in PR context (lines 221-250)
- `src/cli/main.ts`: CLI loads environment variables from `.env` and `.env.local` which may contain untrusted values in PR fork contexts (lines 78-90)

**Current Behavior:**
- GitHub Action runs on `pull_request` events from forks with `permissions: contents: write`
- Config loading reads `warden.toml` from checked-out PR branch (potentially attacker-controlled in fork PRs)
- Remote skill URLs in config are processed without origin allowlist or signature verification
- No distinction between trusted (base branch) and untrusted (PR branch) config sources

### Skill Execution Isolation and Sandboxing

**Attack Surface:**
- Skills execute with full repository access, secrets, and filesystem permissions
- No sandboxing or permission boundary enforcement beyond tool allowlists
- Skill output not validated before use in subsequent operations
- Child processes spawned with inherited environment and permissions

**Repository Evidence:**
- `src/coordinator/agentic.ts`: Superwarden synthesis agents have tools `['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']` (line 9)
- `src/coordinator/child-skills.ts`: Child skill synthesis writes `allowed-tools: Read Grep Glob WebFetch WebSearch` (line 224)
- No evidence of process sandboxing, filesystem isolation, or secret filtering in skill execution paths

**Current Behavior:**
- Skills declare allowed tools via frontmatter `allowed-tools` field
- Tool enforcement happens at SDK runtime level but skills have full access to declared tools
- No filesystem path restrictions, secret redaction, or network isolation for skill execution
- Remote skills execute with same privileges as local skills

### Dependency and Supply Chain Integrity

**Attack Surface:**
- Skill dependencies (npm packages, external tools) resolved without integrity verification
- Dependency confusion via attacker-published packages with same name as internal dependencies
- Lock file poisoning or substitution attacks
- Skill dependencies not isolated from Warden's own dependencies

**Repository Evidence:**
- No evidence of skill-specific dependency installation or resolution in `src/skills/` modules
- Skills are markdown files with embedded prompts; no package.json or dependency manifest format observed
- Warden's own dependencies use `pnpm-lock.yaml` with SHA-512 integrity hashes (per npm ecosystem standard)

**Current Behavior:**
- Skills do not have separate dependency manifests; they are prompt templates
- No skill-specific npm install, pip install, or similar dependency resolution
- Risk is limited to Warden's own supply chain, not skill-specific dependencies

## Reporting Contract

Each finding must include:

1. **Changed line anchoring**: Specific line numbers where untrusted input influences skill operations without validation
2. **Concrete data-flow trace**: From untrusted input source (config, PR metadata, workflow input) to vulnerable operation (remote fetch, cache write, skill selection, execution context)
3. **Repository source reference**: Existing skill loading patterns (skill loader, cache manager, execution runtime) that inform the vulnerability analysis
4. **Public documentation citation**: Supply chain attack mitigations (npm integrity, git clone safety, HTTP cache poisoning) when external behavior affects exploitability
5. **Realistic attack scenario**: How an attacker substitutes malicious skills or poisons cache
6. **Smallest safe fix**: Concrete integrity verification, input validation, or sandboxing approach

## Missing Context

The following context would improve vulnerability detection but is not available from repository inspection alone:

- **Skill provenance verification mechanism**: Whether Warden verifies git commit signatures, publisher identities, or skill registry metadata before loading remote skills
- **Execution sandboxing model**: Whether skills run in isolated containers, restricted filesystems, or namespaced environments
- **Dependency isolation strategy**: Whether skill dependencies (if any future format supports them) are resolved in isolated package registries or namespaces
- **GitHub Action deployment model**: Whether the Action runs only on protected branches or also processes untrusted fork PRs with elevated permissions

When these details are missing, state the gap explicitly and describe what evidence would confirm or rule out the vulnerability.
