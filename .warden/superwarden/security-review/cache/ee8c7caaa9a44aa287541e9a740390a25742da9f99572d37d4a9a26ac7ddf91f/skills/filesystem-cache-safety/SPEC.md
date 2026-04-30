# security-review-filesystem-cache-safety Child Skill Specification

## Intent

This is a Superwarden child skill synthesized from the parent "security-review" for task "filesystem-cache-safety".

It detects path traversal, symlink attacks, cache poisoning, unintended writes, and filesystem race conditions in changed TypeScript code affecting Warden's config loading, skill caching, output generation, and temporary file handling.

## Scope

**In scope:**

1. **Path Traversal and Symlink Attacks** in changed TypeScript code:
   - Untrusted input (PR file paths, config values, skill names, branch names, user arguments, remote repository references) flowing into file path construction
   - `path.join`, `path.resolve`, or string concatenation without canonical validation
   - `../` sequences, absolute paths, drive-relative paths (`C:../`), symlink dereference without validation
   - Directory escapes from `.warden/`, cache/, output/, skill roots, config directories
   - Missing `fs.realpath` canonical validation or boundary checks

2. **Cache Poisoning and Integrity** in changed TypeScript code:
   - Cache key construction influenced by untrusted input (plan hashes, task hashes, source hashes, remote refs)
   - Cache writes or reads in Superwarden plan cache, child skill cache, remote skill cache, state.json
   - Missing cache integrity verification (hash mismatch, schema validation failure)
   - Non-atomic cache writes (partial writes, race conditions)
   - Attacker-controlled content written to cache and later executed or included

3. **Unintended Writes and Overwrites** in changed TypeScript code:
   - File paths controlled by untrusted input flowing into write operations
   - Overwrites of sensitive files (`.git/config`, `.github/workflows/`, `node_modules/`, `package.json`, skill definitions)
   - Missing file existence validation before writes
   - Insecure write permissions (world-writable directories or files)

4. **Temporary File and Directory Handling** in changed TypeScript code:
   - Predictable temp paths (not using `fs.mkdtemp` random suffix)
   - Insecure temp permissions (not 0700 for directories, 0600 for files)
   - Missing cleanup on error or signal paths
   - Unsafe `os.tmpdir()` usage

5. **Filesystem Race Conditions (TOCTOU)** in changed TypeScript code:
   - `fs.existsSync` followed by `fs.readFile`, `fs.writeFile`, or `fs.mkdirSync`
   - File or symlink replacement between check and use
   - Non-atomic operations (split across check/use instead of single open-and-validate)

**Out of scope:**

- Generic filesystem permission hardening unrelated to changed code paths
- Recommendations to use different temp libraries unless the changed code introduces a new insecure pattern
- Dependency vulnerability reports unless the changed code introduces a new exploitable filesystem call
- Filesystem issues in unchanged code unless new data flow from changed lines triggers the vulnerability
- Theoretical race conditions without evidence that changed code introduces a TOCTOU pattern

## Evidence Requirements

Each finding must include:

1. **Changed line anchor:** Specific line numbers in changed code where the vulnerability exists
2. **Data-flow trace:** Concrete path from untrusted input source (PR file path, config value, skill name, user argument, remote ref) to vulnerable filesystem operation
3. **Repository context:** Reference to existing patterns in `src/config/loader.ts`, `src/skills/loader.ts`, `src/skills/remote.ts`, `src/coordinator/child-skills.ts`, `src/coordinator/superwarden.ts`, `src/cli/output/`
4. **External documentation:** Citation of public Node.js security guidance (CVE-2026-31802 drive-relative path traversal, fs.realpath canonical validation best practices) when framework behavior affects the attack
5. **Attack scenario:** Realistic, concrete demonstration of how an attacker with control over the untrusted input can escape directories, poison cache, or overwrite files
6. **Smallest safe fix:** Specific mitigation approach (canonical path validation with fs.realpath + boundary check, cache integrity verification, atomic write operation, restrictive permissions, TOCTOU elimination)

**When evidence is insufficient:**
Return an empty findings array. Do NOT report speculative findings.

## Repository Patterns to Inspect

**Config Loading (`src/config/loader.ts`):**
- Path construction: `join(configDir, 'warden.toml')`, `join(repoPath, options.configPath)`, `join(repoPath, options.baseConfigPath)`
- TOCTOU: `existsSync` followed by `readFileSync`
- Normalization: `normalize(baseConfigPath)`, `normalize(repoConfigPath)`

**Skill Loading (`src/skills/loader.ts`):**
- Path resolution: `resolveSkillPath` (tilde expansion, absolute paths, relative paths)
- Directory traversal: `join(repoRoot, dir)`, `join(dirPath, entry)`
- Symlink safety: No `fs.realpath` usage detected

**Remote Skill Caching (`src/skills/remote.ts`):**
- Cache path construction: `getRemotePath`, `join(cacheDir, parsed.owner, parsed.repo)`, `join(cacheDir, parsed.owner, \`${parsed.repo}@${parsed.sha}\`)`
- Path traversal prevention: `safeNamePattern` validation in `parseRemoteRef` (rejects `..` in owner/repo)
- Symlink attack in marketplace: `resolve(skillsPath)` boundary check at line 538-542 to prevent path traversal via malicious `marketplace.json`
- Atomic state writes: `writeFileSync` to temp, then `renameSync` (atomic on most filesystems)

**Superwarden Child Skills (`src/coordinator/child-skills.ts`):**
- Cache directory: `getCoordinatorChildSkillsRoot` returns `join(dirname(cachePath), basename(cachePath, '.json'), 'skills')`
- Task directory: `join(rootDir, safePathSegment(task.id))` where `safePathSegment` replaces non-alphanumeric chars with `-`
- Artifact writes: `writeFileSync` for SKILL.md, SPEC.md, SOURCES.md (no atomic write pattern)
- Cache metadata: JSON written atomically (but no signature/hash verification on read)

**Superwarden Skills (`src/coordinator/superwarden.ts`):**
- Skill directory: `getSuperwardenSkillRoot` returns `join(getSuperwardenRoot(repoRoot), safePathSegment(skillName))`
- Skill creation: `writeFileSync` for SKILL.md, SPEC.md, SOURCES.md, warden.yaml

**Output Formatting (`src/cli/output/formatters.ts`):**
- No file writes detected (formatting only)

## External Behavior Affecting Findings

**Node.js Path Traversal (CVE-2026-31802):**
- Drive-relative paths (`C:../`) can bypass `path.join`/`path.resolve` normalization on Windows
- Validation must happen AFTER removing drive prefixes, not before
- See: [CVE-2026-31802 GitHub Advisory](https://github.com/advisories/GHSA-9ppj-qmqm-q256)

**Canonical Path Validation Best Practices:**
- `path.resolve()` normalizes `..` sequences but does NOT follow symlinks
- `fs.realpath()` follows symlinks and returns canonical path (throws ENOENT if file doesn't exist)
- Defense in depth: `resolve()` + `realpath()` + boundary check (`.startsWith(expectedBase)`)
- See: [Node.js Path Traversal Security Guide](https://nodejsdesignpatterns.com/blog/nodejs-path-traversal-security/)

**Atomic File Operations:**
- `renameSync` is atomic on most filesystems (POSIX, NTFS)
- Write-to-temp-then-rename pattern prevents partial writes and race conditions
- Example from `src/skills/remote.ts:236-250` (`saveState`)

## Missing Context

The following context cannot be determined from repository code alone:

1. **Deployment filesystem permissions:** Are cache directories isolated per-user? Are output directories writable by other users?
2. **Temp directory cleanup policy:** Does Warden clean up temp files on exit? Are signal handlers installed?
3. **Symbolic link policy:** Are symlinks allowed in skill directories? In config directories?
4. **Cache directory trust model:** Is `~/.local/warden/skills/` considered trusted after first fetch? Is there a signature verification mechanism?

If these details affect a vulnerability's exploitability, state the missing context in the finding.

## Reporting Contract

Each finding must include:
- `id`: Unique identifier (e.g., `fs-cache-001`)
- `title`: Concise description
- `severity`: `high`, `medium`, or `low`
- `confidence`: `high`, `medium`, or `low`
- `location`: `{ path: string, startLine?: number, endLine?: number }`
- `description`: Detailed explanation with data-flow trace, attack scenario, repository context, external documentation citation, and smallest safe fix
- `category`: One of `path-traversal`, `symlink-attack`, `cache-poisoning`, `unintended-write`, `temp-file-insecurity`, `toctou-race`

If no vulnerabilities are found with sufficient evidence, return an empty array: `[]`.

## Output Format

JSON array of findings, or empty array if no findings meet evidence requirements.
