# security-review-auth-trust-boundaries Sources

## Parent Superwarden Context

**Parent skill**: security-review

**Task ID**: auth-trust-boundaries

**Parent plan cache**: ee8c7caaa9a44aa287541e9a740390a25742da9f99572d37d4a9a26ac7ddf91f.json

**Coordinator version**: 1

**Source hash**: d2e4a18d51a9a9da573d3434eaee7486118b965021131e6866bc8df61719437

## Repository Source Files Inspected

### Skill Loading Patterns

- `src/skills/loader.ts`: Skill resolution, conventional directories, path handling, frontmatter parsing, cache management
- `src/skills/remote.ts`: Remote skill fetching, git operations, parseRemoteRef validation, marketplace.json handling, path traversal prevention
- `src/coordinator/child-skills.ts`: Child skill synthesis, cache integrity validation, artifact generation, structured LLM agent invocation

### Configuration Loading and Validation

- `src/config/loader.ts`: Layered config loading, base vs repo config separation, skill root validation, TOML parsing
- `src/config/schema.ts`: Zod schemas for skill config, tool permissions, trigger types, execution modes, runtime settings

### CLI and Output Rendering

- `src/cli/main.ts`: CLI entry point, environment loading, reporter creation, event context building
- `src/cli/output/formatters.ts`: Terminal output formatting, severity/confidence badges, finding display, stats rendering

## External Sources Consulted

### GitHub Actions Security (2026)

**pull_request vs pull_request_target trust boundaries**:
- [Preventing pwn requests | GitHub Security Lab](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/): Event trigger security model, write permissions, secrets exposure, safe usage guidelines
- [Actions pull_request_target and environment branch protections changes](https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/): 2025 GITHUB_REF security update for pull_request_target

**Workflow command injection**:
- [Workflow commands for GitHub Actions - GitHub Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands): ::set-output deprecation, ::add-mask usage, ::stop-commands injection risk
- [GitHub Actions Security Best Practices](https://blog.gitguardian.com/github-actions-security-cheat-sheet/): Comprehensive security cheat sheet for Actions workflows

### TypeScript Authorization Bypass (2026)

**Type casting and runtime validation**:
- [Vulnerabilities in Convenience: The Trade-offs of TypeScript Hacks](https://fsjs.dev/vulnerabilities-in-convenience-typescript-hacks/): Type casting bypass patterns, authorization vulnerability examples, safe validation practices
- [CVE-2026-4549: next-saas-stripe-starter Auth Bypass Flaw](https://www.sentinelone.com/vulnerability-database/cve-2026-4549/): Real-world authorization bypass in TypeScript application (openCustomerPortal function)

### Node.js Path Traversal and Command Injection

**Path traversal prevention**:
- Repository code inspection shows path validation patterns in `src/skills/remote.ts` using safe name regex and resolve() prefix checks
- Marketplace plugin source path validation prevents escaping repository directory

**Command injection prevention**:
- `execGit` in `src/skills/remote.ts` uses `--` separator and rejects arguments starting with `-`
- HTTP upgrade to HTTPS in clone URL normalization

## Parent Plan External Sources

The parent Superwarden plan for security-review consulted:

- [TypeScript Security Guide 2025](https://secably.com/learn/language-security/typescript/): TypeScript vulnerability patterns
- [CVE-2026-31802: node-tar Symlink Path Traversal](https://www.miggo.io/vulnerability-database/cve/CVE-2026-31802): 2026 path traversal patterns
- [GitHub Actions 2026 security roadmap](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/): Workflow injection and secret exfiltration
- [Prompt Injection Attacks 2026](https://www.kunalganglani.com/blog/prompt-injection-2026-owasp-llm-vulnerability): OWASP LLM Top 10 #1 risk
- [NodeJS Command Injection Guide](https://www.stackhawk.com/blog/nodejs-command-injection-examples-and-prevention/): child_process security
- [CVE-2024-27980: Node.js child_process batch file injection](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2): Command injection in spawn without shell

## Repository Context Patterns

### Skill Loading Trust Boundaries

Warden loads skills from multiple sources with trust differentiation:

1. **Local conventional directories** (`.agents/skills`, `.claude/skills`, `.warden/superwarden`, `.warden/skills`) checked in priority order
2. **Remote repositories** via git clone with URL/SHA validation and cache integrity
3. **Child skill synthesis** via LLM agent with structured output validation and cache hash verification

Trust boundary enforcement:
- Remote skill URLs validated via `parseRemoteRef` with safe name pattern and flag injection prevention
- Git commands use `--` separator and reject `-` prefixed arguments
- Marketplace plugin sources validated with path prefix check to prevent traversal
- Child skill names sanitized via `safePathSegment` regex replacement

### Configuration Trust Boundaries

Warden uses layered config with base (trusted) vs repo (untrusted) separation:

- Base config loaded from CLI-specified path (e.g., organization policy)
- Repo config loaded from repository warden.toml (potentially untrusted fork)
- Skill roots validated with existsSync, different roots for base vs repo skills
- Schema validation via Zod enforces types and prevents unexpected field values

### Output Rendering Trust Boundaries

Current formatters.ts inspection shows:
- Direct rendering of finding titles and file paths without escaping
- No evidence of GitHub Actions workflow command sanitization
- Terminal output uses chalk for coloring but no HTML/markdown escaping visible

**This is a gap where workflow command injection could occur if finding text or file paths are user-controlled.**

## Missing Context Acknowledged

As noted in the parent Superwarden plan synthesis.missingInputs:

- **Warden deployment model**: Whether GitHub Action runs in untrusted fork contexts or only on protected branches
- **Skill provenance verification**: Current signature, hash, or trust-on-first-use behavior for remote skill loading (cache state.json tracks SHA and fetchedAt but no signature verification observed)
- **Tool permission boundary enforcement**: Runtime vs declaration-time validation of Bash/filesystem permissions
- **Secret storage location**: Environment variables, .env files, GitHub Secrets, or external credential managers

These gaps affect risk assessment but do not prevent finding concrete trust boundary violations in changed code.
