# security-review-filesystem-cache-safety Child Skill Sources

## Source Inventory

| Source | Type | Use |
| --- | --- | --- |
| Parent Superwarden Plan | Internal | Task definition, scope, evidence requirements, out-of-scope exclusions |
| `src/config/loader.ts` | Repository | Config path construction, TOCTOU patterns, normalization |
| `src/skills/loader.ts` | Repository | Skill path resolution, directory traversal, symlink handling |
| `src/skills/remote.ts` | Repository | Remote skill cache paths, path traversal prevention, atomic writes, marketplace symlink attack prevention |
| `src/coordinator/child-skills.ts` | Repository | Child skill cache management, artifact writes, task directory construction |
| `src/coordinator/superwarden.ts` | Repository | Superwarden skill directory construction, skill creation writes |
| `src/cli/output/formatters.ts` | Repository | Output formatting (no file writes) |
| CVE-2026-31802 GitHub Advisory | External | Drive-relative path traversal vulnerability in node-tar, demonstrates Windows-specific `C:../` bypass pattern |
| Node.js Path Traversal Security Guide | External | Canonical path validation best practices (fs.realpath, boundary checks, defense in depth) |

## Repository Pattern Analysis

### Path Construction Patterns

**Safe patterns observed:**
- `src/skills/remote.ts:155-161`: `safeNamePattern` regex validation rejects `..` in owner/repo names to prevent traversal
- `src/skills/remote.ts:538-542`: `resolve()` + boundary check prevents marketplace.json path traversal
- `src/coordinator/child-skills.ts:94-96`: `safePathSegment` sanitizes task IDs and skill names for safe directory names

**Potentially unsafe patterns:**
- `src/config/loader.ts:221-224`: User-controlled `options.configPath` and `options.baseConfigPath` passed to `join(repoPath, ...)` without canonical validation
- `src/skills/loader.ts:78-94`: `resolveSkillPath` expands `~` and joins with `repoRoot` but does NOT use `fs.realpath` to validate symlinks
- Multiple TOCTOU patterns: `existsSync` followed by `readFileSync` in config loader, skill loader, remote skill discovery

### Cache Integrity Patterns

**Atomic writes:**
- `src/skills/remote.ts:236-250`: `saveState` uses write-to-temp-then-rename (atomic)
- `src/coordinator/child-skills.ts:332-343`: `writeCachedChildSkill` uses direct `writeFileSync` (NOT atomic)

**Cache validation:**
- `src/coordinator/child-skills.ts:360-369`: Hash-based validation (`taskHash`, `sourceHash`, `coordinatorVersion`, `bytes`) before using cached child skill
- `src/skills/remote.ts:272-290`: TTL-based validation for unpinned remote skills, SHA immutability for pinned refs

**Missing validation:**
- No signature verification for cached artifacts
- No content hash verification for remote skill files (only state.json SHA tracking)

### Temporary File Handling

**No temporary file creation detected in changed code.**
- `os.tmpdir()` appears only in test files (not in scope for this skill)

### TOCTOU Patterns

**Observed patterns:**
- `src/config/loader.ts:61-67`: `existsSync(configPath)` followed by `readFileSync(configPath)` — classic TOCTOU
- `src/config/loader.ts:226-227`: `existsSync(baseConfigPath)` followed by later `loadWardenConfigFile(baseConfigPath)`
- `src/skills/loader.ts:298-300`: Cached directory list avoids repeated TOCTOU, but initial `readdir` + per-entry `existsSync` + `loadSkillFromMarkdown` has race windows

## External Source Analysis

### CVE-2026-31802: node-tar Drive-Relative Path Traversal

**Source:** [GitHub Advisory GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256)

**Relevance:** Demonstrates that path traversal validation must occur AFTER drive prefix removal on Windows. A malicious tar entry with `C:../../../target.txt` as a symlink target can bypass `..` checks that run before normalization, because the validation sees the drive prefix and doesn't recognize the traversal sequences. Later, path normalization removes `C:` and creates a symlink with `../../../target.txt`, escaping the extraction directory.

**Impact on Warden:** If Warden processes untrusted file paths or archive extractions (e.g., remote skills, cached artifacts) on Windows, similar drive-relative bypasses could affect path validation in `resolveSkillPath`, `getRemotePath`, or cache directory construction. However, current repository patterns use `join` which handles drive-relative paths correctly on Windows (it treats `C:../` as relative to the current directory on drive C, not as an absolute path).

### Node.js Path Traversal Security Guide

**Source:** [Node.js Path Traversal Security Guide](https://nodejsdesignpatterns.com/blog/nodejs-path-traversal-security/)

**Relevance:** Canonical path validation best practices:
1. Don't try to filter traversal sequences (always bypassable)
2. Canonicalize the path with `fs.realpath()` (follows symlinks)
3. Verify the canonical path starts with the expected base directory
4. Defense in depth: `path.resolve()` (normalizes `..`) + `fs.realpath()` (follows symlinks) + boundary check (`.startsWith()`)

**Impact on Warden:** Current repository code uses `path.join` and `path.resolve` for normalization but does NOT use `fs.realpath()` for canonical validation. This means symlink-based escapes are possible if an attacker can create a symlink in a skill directory, config directory, or cache directory that points outside the intended boundary.

**Example vulnerable pattern:**
```typescript
// src/skills/loader.ts:78-94
export function resolveSkillPath(nameOrPath: string, repoRoot?: string): string {
  if (nameOrPath.startsWith('~/')) {
    return join(homedir(), nameOrPath.slice(2)); // No realpath validation
  }
  if (isAbsolute(nameOrPath)) {
    return nameOrPath; // No realpath validation
  }
  return repoRoot ? join(repoRoot, nameOrPath) : nameOrPath; // No realpath validation
}
```

If `nameOrPath` is a symlink (e.g., `.agents/skills/evil-skill` → `/etc/passwd`), this function will return the symlink path without following it or validating the target is within `repoRoot`.

## Decisions

**Scope focus:**
- Prioritize path traversal and symlink attacks due to external vulnerability patterns (CVE-2026-31802) and missing canonical validation in repository code
- Prioritize cache poisoning due to lack of signature verification and non-atomic writes in child skill cache
- Deprioritize temp file handling (no temp file creation in changed code)
- Include TOCTOU race conditions (multiple `existsSync` + `readFileSync` patterns observed)

**Evidence threshold:**
- Require concrete data-flow trace from untrusted input to vulnerable operation
- Require realistic attack scenario (not theoretical)
- Require repository context showing existing patterns
- Require external documentation citation when framework behavior affects exploitability

**Out-of-scope exclusions:**
- Generic hardening recommendations
- Unchanged code issues (unless new data flow from changed lines triggers them)
- Dependency vulnerabilities (unless new exploitable call introduced)
- Theoretical attacks without evidence

**Missing context to track:**
- Deployment filesystem permissions
- Temp directory cleanup policy
- Symbolic link policy in skill/config directories
- Cache directory trust model and signature verification plans
