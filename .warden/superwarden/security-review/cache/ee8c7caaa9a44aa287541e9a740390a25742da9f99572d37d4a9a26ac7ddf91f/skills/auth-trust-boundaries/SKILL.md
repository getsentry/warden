---
name: security-review-auth-trust-boundaries
description: Detect authorization bypass and trust boundary violations where untrusted input crosses security boundaries without validation in Warden's TypeScript codebase.
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill for parent **security-review** and task **auth-trust-boundaries**.

Review changed TypeScript code for authorization bypass and trust boundary violations in Warden's runtime, CLI, GitHub Action, config loading, skill loading, SDK execution, and output rendering.

## Investigation Requirements

Perform deep repo-local investigation with Read, Grep, and Glob to understand:

- Existing skill loading patterns in `src/skills/loader.ts`, `src/coordinator/child-skills.ts`, `src/skills/remote.ts`
- Configuration loading and validation in `src/config/loader.ts`, `src/config/schema.ts`
- GitHub event processing in `src/cli/main.ts` and GitHub Action entrypoints
- Output rendering and formatter patterns in `src/cli/output/formatters.ts`
- Runtime trust boundary enforcement in SDK and coordinator modules

Use WebSearch or WebFetch for current public documentation when framework or runtime behavior affects findings:

- GitHub Actions event trigger security (pull_request vs pull_request_target)
- GitHub Actions workflow command injection patterns (::set-output, ::add-mask)
- Node.js path traversal and command injection mitigations
- TypeScript authorization bypass patterns (unsafe type casts, runtime validation)

**Critical constraint**: Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework, API, vulnerability class, and ecosystem convention names.

## Scope

Identify authorization bypass and trust boundary violations in changed TypeScript code where untrusted input crosses security boundaries without proper validation or privilege checks.

### 1. Skill Loading and Execution Trust Boundaries

Trace changed code that loads remote skills, caches skill artifacts, or spawns skill execution contexts. Identify:

- Whether untrusted repository input (PR title, body, commit messages, file paths, branch names) can influence skill selection, cache keys, or execution parameters without validation
- Whether local vs remote skill resolution respects different privilege levels
- Whether skill cache integrity is verified through signatures, hashes, or trust-on-first-use patterns
- Whether remote skill URL parsing prevents injection (examine `parseRemoteRef` in `src/skills/remote.ts`)
- Whether git command construction prevents flag injection (check `execGit` argument handling)
- Whether marketplace.json plugin source paths are validated to prevent path traversal

### 2. GitHub Event and Workflow Data Handling

Trace changed code that processes GitHub webhook payloads, workflow inputs, pull request metadata, or Action event data. Identify:

- Whether untrusted fork PR data can influence privileged operations like secret access, branch protection bypass, or workflow approval gates
- Whether event type filtering (pull_request vs pull_request_target) enforces different trust levels per [GitHub Actions security guidance](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
- Whether workflow_dispatch parameters are validated before use in privileged contexts
- Whether GITHUB_REF and GITHUB_SHA are validated when used in security-sensitive operations

### 3. Configuration and Permission Boundaries

Trace changed code that reads warden.toml, .warden/ files, or environment configuration. Identify:

- Whether untrusted repository files can escalate tool permissions (Bash prompt permissions), modify security settings, or override default-deny policies
- Whether config schema validation prevents privilege escalation through unexpected field types or nested structures
- Whether config file paths are validated to prevent path traversal or symlink attacks
- Whether base config vs repo config layer separation enforces trust boundaries
- Whether skill.remote references are validated before use in git operations

### 4. Output Rendering and Injection

Trace changed code that renders findings, diffs, comments, or Action outputs. Identify:

- Whether untrusted finding text, file paths, or code snippets can inject GitHub Actions workflow commands (::set-output, ::add-mask, ::set-env) per [workflow command injection patterns](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)
- Whether HTML/markdown sanitization is applied before rendering
- Whether Action output variables are safely delimited
- Whether ::stop-commands injection can disable ::add-mask for secret exposure
- Whether formatted output (formatters.ts) escapes user-controlled content

## Evidence Requirements

- Anchor each finding to specific changed line numbers where untrusted input crosses a trust boundary without validation
- Include concrete data-flow trace from untrusted input source (PR metadata, config file, remote skill, workflow event) to privileged operation (secret access, command execution, cache write, workflow injection)
- Reference repository source for existing trust boundary patterns (skill loader, config schema, GitHub client, output formatter)
- Cite public documentation for framework-specific trust boundary enforcement (GitHub Actions event types, Node.js privilege inheritance, TypeScript authorization patterns) when behavior affects exploitability
- Provide realistic attack scenario showing attacker control over the untrusted input source
- Describe the smallest safe fix with concrete validation or isolation approach

## Out of Scope

- Generic code style or linting suggestions unrelated to trust boundaries
- Speculative hardening without a concrete attack path from changed code
- Dependency freshness reports unless the changed code introduces a new exploitable call to a vulnerable dependency method
- Threats requiring unrealistic control of trusted local developer machines or build environments
- Authorization issues in unchanged code unless directly triggered by new data flow from changed lines

## Output Format

Return findings as a JSON array. Each finding must include:

- `id`: Unique identifier
- `title`: Brief description of the trust boundary violation
- `severity`: "high", "medium", or "low"
- `confidence`: "high", "medium", or "low"
- `description`: Detailed explanation with data-flow trace
- `location`: File path and line range for the vulnerable code
- `evidence`: Concrete attack path showing exploitation
- `recommendation`: Smallest safe fix with specific validation approach

**Return an empty findings array when evidence is insufficient to confirm a trust boundary violation.** Do not report speculative findings.
