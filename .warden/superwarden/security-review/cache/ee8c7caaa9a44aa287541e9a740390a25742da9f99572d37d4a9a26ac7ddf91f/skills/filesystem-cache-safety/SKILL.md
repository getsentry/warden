---
name: security-review-filesystem-cache-safety
description: Detect path traversal, symlink attacks, cache poisoning, unintended writes, and filesystem race conditions in changed TypeScript code affecting Warden's config loading, skill caching, output generation, and temporary file handling.
allowed-tools: Read Grep Glob WebFetch WebSearch
---

**Superwarden Child Skill: Filesystem and Cache Integrity**

This is a Superwarden child skill synthesized from the parent "security-review" for task "filesystem-cache-safety".

## Execution Requirements

**Deep Repository Investigation:**
Use Read, Grep, and Glob to perform thorough repo-local investigation of:
- Changed TypeScript code in config loading (`src/config/loader.ts`)
- Skill loading and caching (`src/skills/loader.ts`, `src/skills/remote.ts`)
- Superwarden child skill synthesis (`src/coordinator/child-skills.ts`, `src/coordinator/superwarden.ts`)
- Output generation and formatting (`src/cli/output/formatters.ts`, `src/cli/output/jsonl.ts`)
- Any changed code that constructs file paths, writes files, or manages cache directories

**Public External Sources:**
Use WebSearch or WebFetch for current public documentation or prior art when external behavior affects findings:
- Node.js path traversal mitigations (CVE-2026-31802, CVE-2026-23745) for drive-relative and symlink bypass patterns
- Node.js filesystem API security patterns (fs.realpath canonical validation, O_NOFOLLOW)
- Secure temporary file creation patterns (fs.mkdtemp, restrictive permissions)

**Prohibited:**
Do NOT send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework, package, API, vulnerability class, and documentation names.

---

## Vulnerability Categories

### 1. Path Traversal and Symlink Attacks

Trace changed code that constructs file paths from untrusted input:
- **Untrusted input sources:** PR file paths, config values, skill names, branch names, user arguments, remote repository references
- **Vulnerable operations:** `path.join`, `path.resolve`, string concatenation without canonical validation
- **Attack vectors:** `../` sequences, absolute paths, drive-relative paths (`C:../`), symlink dereference without validation
- **Escape targets:** `.warden/`, cache directories, output directories, skill roots, config directories

**What to check:**
- Does code use `fs.realpath` to canonicalize paths before validation?
- Are canonical paths checked against expected base directories using `.startsWith()` after normalization?
- Are symlinks followed without boundary validation (e.g., reading a symlink target without verifying it stays within bounds)?
- Can drive-relative paths bypass normalization (Windows-specific `C:../` pattern from CVE-2026-31802)?

**Key repository patterns to inspect:**
- `src/config/loader.ts`: Config path construction (`join(configDir, 'warden.toml')`, `join(repoPath, options.configPath)`)
- `src/skills/loader.ts`: Skill path resolution (`resolveSkillPath`, `join(dirPath, entry)`, `join(repoRoot, dir)`)
- `src/skills/remote.ts`: Remote skill cache paths (`getRemotePath`, `join(cacheDir, parsed.owner, parsed.repo)`)
- `src/coordinator/child-skills.ts`: Child skill cache directory construction (`getCoordinatorChildSkillsRoot`, `join(rootDir, safePathSegment(task.id))`)
- `src/coordinator/superwarden.ts`: Superwarden skill directory construction (`getSuperwardenSkillRoot`, `join(getSuperwardenRoot(repoRoot), safePathSegment(skillName))`)

**Evidence required:**
- Specific changed lines where untrusted input flows into path construction
- Concrete data-flow trace from input source to filesystem operation
- Proof that canonical validation is missing or bypassable
- Attack scenario showing directory escape or symlink dereference

### 2. Cache Poisoning and Integrity

Trace changed code that writes or reads cache artifacts:
- **Cache locations:** Superwarden plan cache (`.warden/superwarden/<skill>/cache/<plan-hash>.json`), child skill cache, remote skill cache (`~/.local/warden/skills/`), state.json
- **Cache keys:** Plan hashes, task hashes, source hashes, remote refs (owner/repo@sha)
- **Integrity mechanisms:** Hash verification, atomic writes, schema validation

**What to check:**
- Can untrusted input influence cache keys to cause hash collisions or overwrites?
- Is cache integrity verified before use (hash match, schema validation)?
- Are cache writes atomic (write to temp, then rename) to prevent partial writes?
- Can attacker-controlled content be written to cache and later executed or included?

**Key repository patterns to inspect:**
- `src/coordinator/child-skills.ts`: Child skill cache read/write (`loadCachedChildSkill`, `writeCachedChildSkill`, atomic write pattern with `writeFileSync`)
- `src/skills/remote.ts`: Remote skill cache and state management (`saveState` with atomic write, `loadState`, `fetchRemote`)
- `src/coordinator/plan.ts`: Plan cache hashing and storage

**Evidence required:**
- Specific changed lines where cache keys or content can be influenced by untrusted input
- Data-flow trace from input to cache write or read
- Proof that integrity validation is missing or insufficient
- Attack scenario showing cache poisoning leading to code execution or privilege escalation

### 3. Unintended Writes and Overwrites

Trace changed code that writes output files, reports, logs, or temporary files:
- **Write targets:** Output files, reports, logs, Superwarden artifacts, skill files, config files
- **Sensitive overwrite targets:** `.git/config`, `.github/workflows/`, `node_modules/`, `package.json`, skill definitions

**What to check:**
- Can file paths be controlled by untrusted input to overwrite sensitive files?
- Is file existence validated before write to prevent unintended overwrites?
- Do write operations use restrictive permissions (no world-writable)?
- Are directory creation operations safe (no race conditions, restrictive mode)?

**Key repository patterns to inspect:**
- `src/coordinator/child-skills.ts`: Child skill artifact writes (`writeChildSkillArtifact`, `writeFileSync` for SKILL.md/SPEC.md/SOURCES.md)
- `src/coordinator/superwarden.ts`: Superwarden skill creation (`createSuperwardenSkill`, `writeFileSync` for skill files)
- `src/cli/output/jsonl.ts`: JSONL output writing
- `src/config/writer.ts`: Config file writes

**Evidence required:**
- Specific changed lines where file paths flow from untrusted input to write operations
- Proof that path validation is missing or bypassable
- Attack scenario showing overwrite of sensitive files

### 4. Temporary File and Directory Handling

Trace changed code that creates temporary files or directories:
- **Temp usage:** Skill execution, subprocess communication, cache staging
- **Insecure patterns:** Predictable temp paths, world-readable permissions, missing cleanup

**What to check:**
- Are temp paths created with `fs.mkdtemp` (random suffix) or are they predictable?
- Do temp files/directories use restrictive permissions (0700 for directories, 0600 for files)?
- Is cleanup guaranteed even on error or signal paths (try/finally, signal handlers)?
- Does code use `os.tmpdir()` safely?

**Key repository patterns to inspect:**
- Search for `os.tmpdir()`, `mkdtemp`, temporary file creation patterns
- Check cleanup patterns in skill execution and subprocess code

**Evidence required:**
- Specific changed lines creating temp files/directories with insecure patterns
- Proof that cleanup is missing or can be bypassed
- Attack scenario showing temp file exploitation

### 5. Filesystem Race Conditions (TOCTOU)

Trace changed code with time-of-check-time-of-use patterns:
- **TOCTOU patterns:** `fs.existsSync` followed by `fs.readFile`, `fs.writeFile`, or `fs.mkdirSync`
- **Race window:** File or symlink replaced between check and use

**What to check:**
- Are operations atomic (single open-and-validate call) or split across check/use?
- Can an attacker replace a file or symlink between check and use?
- Are file descriptors used to avoid TOCTOU (open once, validate, then use)?

**Key repository patterns to inspect:**
- `src/config/loader.ts`: `existsSync` followed by `readFileSync`
- `src/skills/loader.ts`: `existsSync` followed by read operations
- `src/coordinator/child-skills.ts`: `existsSync` checks before reads

**Evidence required:**
- Specific changed lines with TOCTOU pattern
- Proof that race window is exploitable
- Attack scenario showing symlink or file replacement exploitation

---

## Evidence Requirements (Mandatory)

For each finding, provide:

1. **Changed line anchor:** Specific line numbers where the vulnerability exists in changed code
2. **Data-flow trace:** Concrete path from untrusted input source to vulnerable filesystem operation
3. **Repository context:** Reference existing patterns in config loader, cache manager, output writer, skill loader
4. **External documentation:** Cite public Node.js security guidance (CVE-2026-31802, fs.realpath best practices) when behavior affects the attack
5. **Attack scenario:** Realistic, concrete attack showing how an attacker escapes directories, poisons cache, or overwrites files
6. **Smallest safe fix:** Specific mitigation (canonical path validation, cache integrity check, atomic operation, restrictive permissions)

**When evidence is insufficient:**
Return an empty findings array. Do NOT report speculative findings.

**Missing context to document:**
If deployment filesystem permissions, cache directory isolation, or temp directory cleanup policy cannot be determined from repository code, state the missing context in the finding or in a separate note.

---

## Out of Scope

- Generic filesystem permission hardening unrelated to changed code paths
- Recommendations to use different temp libraries unless the changed code introduces a new insecure pattern
- Dependency vulnerability reports unless the changed code introduces a new exploitable filesystem call
- Filesystem issues in unchanged code unless new data flow from changed lines triggers the vulnerability
- Theoretical race conditions without evidence that changed code introduces a TOCTOU pattern

---

## Output Format

Return findings as a JSON array. Each finding must include:
- `id`: Unique identifier
- `title`: Concise description of the vulnerability
- `severity`: `high`, `medium`, or `low`
- `confidence`: `high`, `medium`, or `low`
- `location`: File path and line range in changed code
- `description`: Detailed explanation with data-flow trace, attack scenario, and fix
- `category`: One of `path-traversal`, `symlink-attack`, `cache-poisoning`, `unintended-write`, `temp-file-insecurity`, `toctou-race`

If no vulnerabilities are found with sufficient evidence, return an empty array: `[]`.
