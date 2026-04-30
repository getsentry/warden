# security-review-remote-skill-repository-input Child Skill Sources

## Parent Superwarden Plan

**Plan Cache:** `ee8c7caaa9a44aa287541e9a740390a25742da9f99572d37d4a9a26ac7ddf91f.json`

**Parent Skill:** security-review (version 1, coordinator version 1, source hash `d2e4a18d51a9a9da573d3434eaee7486118b9965021131e6866bc8df61719437`)

**Task Definition:**
- **ID:** remote-skill-repository-input
- **Title:** Remote Skill Loading and Untrusted Repository Input
- **Scope:** Identify vulnerabilities in remote skill fetching, cache integrity, skill provenance verification, and untrusted repository input handling in changed TypeScript code affecting Warden's skill loading, caching, and execution.

**Parent Plan Synthesis Phases:**
1. collect-inputs: generated
2. assess-source-depth: generated
3. identify-research-needs: generated
4. synthesize-tasks: generated
5. validate-coverage: validated

**Parent Plan Missing Inputs:**
- Warden deployment model: whether GitHub Action runs in untrusted fork contexts or only on protected branches
- Skill provenance verification: current signature, hash, or trust-on-first-use behavior for remote skill loading
- Tool permission boundary enforcement: runtime vs declaration-time validation of Bash/filesystem permissions
- Secret storage location: environment variables, .env files, GitHub Secrets, or external credential managers

## Repository Source Files Inspected

| File | Purpose |
|------|----------|
| `src/skills/loader.ts` | Skill resolution, loading, and discovery logic; conventional directory search order; remote skill integration |
| `src/skills/remote.ts` | Remote skill fetching via git clone, cache management, state persistence, SHA tracking, TTL refresh logic |
| `src/coordinator/child-skills.ts` | Superwarden child skill synthesis, cache writing, artifact generation |
| `src/config/schema.ts` | Config schema including `SkillConfig.remote` field, tool permissions, execution modes |
| `src/config/loader.ts` | Config loading, skill resolution with `remote` option, environment variable processing |
| `src/cli/main.ts` | CLI entrypoint, environment loading from `.env` files, config path resolution |
| `.github/workflows/warden.yml` | GitHub Action workflow configuration, pull_request event triggers, permissions |
| `src/coordinator/agentic.ts` | Superwarden synthesis agent tool allowlist |

## External Sources Consulted

### npm Package Integrity and Lock File Security

**Source:** [Lockfile poisoning and how hashes verify integrity in Node.js lockfiles](https://medium.com/node-js-cybersecurity/lockfile-poisoning-and-how-hashes-verify-integrity-in-node-js-lockfiles-0f105a6a18cd)

**Reason:** Current npm package integrity verification mechanisms (SHA-512 hashes in `package-lock.json`) inform whether skill dependencies (if supported) would be protected against tampering.

**Key Findings:**
- npm lockfiles use SHA-512 cryptographic hashes in the `integrity` field to verify package contents
- Each package download is re-hashed and compared against lockfile hash; mismatch halts installation with `EINTEGRITY` error
- Protects against registry compromise, man-in-the-middle attacks, and lockfile poisoning

**Relevance:** Warden's remote skill cache (`state.json`) stores git commit SHA but does not cryptographically verify skill content integrity before execution. Unlike npm's integrity field, Warden's SHA is self-attesting (written by the same fetch operation that downloads the skill).

### Git Clone Security and Malicious Repository Attacks

**Source:** [Git security vulnerabilities announced - The GitHub Blog](https://github.blog/open-source/git/git-security-vulnerabilities-announced-6/)

**Source:** [CrowdStrike Falcon Blocks Git Vulnerability CVE-2025-48384](https://www.crowdstrike.com/en-us/blog/crowdstrike-falcon-blocks-git-vulnerability-cve-2025-48384/)

**Source:** [malicious repositories can execute remote code while cloning · Advisory · git/git · GitHub](https://github.com/git/git/security/advisories/GHSA-8prw-h3cq-mghm)

**Reason:** Warden uses `git clone` to fetch remote skills; recent git vulnerabilities demonstrate remote code execution via malicious `.gitmodules` or submodule paths.

**Key Findings:**
- CVE-2025-48384: Malicious `.gitmodules` with trailing carriage return in submodule path allows arbitrary file write during `git clone --recursive`
- CVE-2026-26268: AI development tool vulnerability allows code execution via cloned repository without user interaction
- Mitigation: Upgrade to Git 2.50.1 or avoid `git clone --recurse-submodules` against untrusted repositories

**Relevance:** Warden's `fetchRemote()` in `src/skills/remote.ts` uses `git clone --depth=1` (not `--recurse-submodules`) which reduces but does not eliminate git-based attack surface. Attacker-controlled repository URLs from config can still exploit git client vulnerabilities or deliver malicious skill content.

### HTTP Cache Poisoning Attack Vectors

**Source:** [Web Cache Poisoning Attacks and Security Best Practices](https://www.vaadata.com/blog/web-cache-poisoning-attacks-and-security-best-practices/)

**Source:** [Avoid Web Cache Poisoning · Cloudflare Cache (CDN) docs](https://developers.cloudflare.com/cache/cache-security/avoid-web-poisoning/)

**Reason:** If Warden's remote skill cache can be influenced by untrusted HTTP headers, cache keys, or response manipulation, attackers could poison the skill cache.

**Key Findings:**
- Cache poisoning tricks web cache into storing malicious response, served to all users until expiry
- Mitigations: input validation, cache key normalization, `Vary` headers, `Cache-Control: private` for sensitive content, WAF rules
- Cache keys should not include unsanitized user input; port numbers and header values should be stripped before key generation

**Relevance:** Warden's skill cache uses filesystem paths (`~/.local/warden/skills/owner/repo/` or `owner/repo@sha/`) as cache keys. Cache keys are derived from `parseRemoteRef()` which validates format but does not prevent attacker from specifying malicious repository URLs in config. No HTTP-level cache poisoning risk observed (git clone is used, not HTTP fetch), but cache directory collisions or race conditions could enable local cache poisoning.

### npm Dependency Confusion and Substitution Attacks

**Source:** [Detect and prevent dependency confusion attacks on npm to maintain supply chain security | Snyk](https://snyk.io/blog/detect-prevent-dependency-confusion-attacks-npm-supply-chain-security/)

**Source:** [axios Compromised: npm Supply Chain Attack via Dependency Injection](https://safedep.io/axios-npm-supply-chain-compromise/)

**Reason:** If Warden skills support npm dependencies in the future, dependency confusion (attacker publishes public package with same name as internal dependency) could compromise skill execution.

**Key Findings:**
- Dependency confusion: package manager downloads public package instead of intended internal package when names collide
- March 2026 axios compromise: malicious versions 1.14.1 and 0.30.4 published via compromised maintainer account, injected `plain-crypto-js` dependency with C2 payload
- Mitigations: namespaces/scopes for internal packages, private registry configuration, dependency pinning with integrity hashes

**Relevance:** Current skill format (markdown with YAML frontmatter) does not support npm dependencies. Risk is limited to Warden's own supply chain. If future skill formats add dependency manifests, dependency confusion would become relevant.

### Agent Skills and Supply Chain Security

**Source:** [Manage agent skills with GitHub CLI - GitHub Changelog](https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/)

**Source:** [ClawSec (Prompt Security) | ClawTrackr](https://clawtrackr.com/implementation/clawsec-prompt-security/)

**Reason:** GitHub's `gh skill` command and ClawSec security skill suite demonstrate current industry approaches to skill provenance, integrity verification, and supply chain risk mitigation.

**Key Findings:**
- GitHub `gh skill` provides package-manager-like guarantees for agent skills: "A skill that changes silently between installs is a supply chain risk."
- ClawSec (March 2026, Prompt Security/SentinelOne) includes SOUL.md drift detection, supply chain compromise protection (validates skill integrity before loading), and prompt injection defenses
- Supply Chain Guard skill audits project dependencies against real-time database of compromised packages

**Relevance:** Warden's remote skill loading lacks integrity verification beyond git SHA tracking. Industry best practices (GitHub `gh skill`, ClawSec) emphasize skill integrity validation, drift detection, and provenance verification—mechanisms not currently present in Warden's skill loader.

### WordPress Plugin Supply Chain Crisis (2026)

**Source:** [30 WordPress Plugins Bought And Backdoored: The 2026 Supply Chain Attack Explained](https://blueheadline.com/cybersecurity/wordpress-plugin-backdoor-supply-chain-attack/)

**Reason:** Demonstrates real-world supply chain attack where trusted plugin portfolio was backdoored via ownership transfer, affecting 400,000 websites.

**Key Findings:**
- April 7, 2026: WordPress.org pulled 31 "Essential Plugin" portfolio plugins after PHP deserialization backdoor discovered
- Attack vector: plugin ownership transferred to malicious actor who injected backdoor into every plugin
- Demonstrates risk of trust-on-first-use when publisher identity is not verified

**Relevance:** Warden's remote skill loading relies on trust-on-first-use (first fetch stores SHA, subsequent fetches verify SHA). If repository ownership transfers to attacker, unpinned refs (without `@sha`) will fetch compromised skills on next TTL refresh. Pinned refs (with `@sha`) are protected but only if SHA was originally pinned to trusted commit.

## Synthesis Approach

This child skill was synthesized through:

1. **Repository inspection**: Read `src/skills/loader.ts`, `src/skills/remote.ts`, `src/coordinator/child-skills.ts`, `src/config/schema.ts`, `src/config/loader.ts` to understand remote skill loading, caching, and config processing.
2. **Attack surface mapping**: Identified untrusted input sources (config `remote` field, PR metadata, workflow inputs, environment variables) and traced data flow to skill operations (remote fetch, cache write, skill selection, execution).
3. **Public prior art research**: Consulted 2026 supply chain attack patterns (npm dependency confusion, git clone vulnerabilities, HTTP cache poisoning, WordPress plugin backdoors) to identify exploitable behaviors.
4. **Current behavior documentation**: Described existing cache mechanisms, TTL refresh, SHA tracking, trust-on-first-use patterns, and tool permission model.
5. **Missing context identification**: Stated gaps in deployment model, provenance verification, and sandboxing that would be required to confirm or rule out vulnerabilities.

No repository code, secrets, private file paths, or proprietary details were sent to web tools. Only public framework, API, vulnerability class, and ecosystem convention names were used in external searches.
