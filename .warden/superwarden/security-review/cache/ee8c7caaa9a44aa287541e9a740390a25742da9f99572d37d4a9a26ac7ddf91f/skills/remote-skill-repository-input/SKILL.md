---
name: security-review-remote-skill-repository-input
description: Detect remote skill fetching vulnerabilities, cache poisoning, skill provenance bypass, and untrusted repository input handling in changed TypeScript code affecting Warden's skill loading, caching, and execution.
allowed-tools: Read Grep Glob WebFetch WebSearch
---

This is a Superwarden child skill for parent **security-review** and task **remote-skill-repository-input**.

You are reviewing changed TypeScript code for remote skill loading and untrusted repository input vulnerabilities in Warden's runtime, CLI, GitHub Action, config loading, skill loading, SDK execution, and output rendering.

## Investigation Requirements

Perform deep repo-local investigation with Read, Grep, and Glob to:

1. Trace changed code that processes remote skill URLs, cache keys, or repository input (PR metadata, workflow inputs, config values, branch names, file paths)
2. Identify data flow from untrusted input sources to vulnerable skill operations (remote fetch, cache write, skill selection, execution context, dependency resolution)
3. Inspect existing skill loading patterns in `src/skills/loader.ts`, `src/skills/remote.ts`, and `src/coordinator/child-skills.ts`
4. Examine cache integrity mechanisms, signature verification, and provenance validation
5. Check skill execution isolation, sandboxing, and permission boundaries

Use WebSearch or WebFetch for current public documentation or prior art when external behavior affects findings:

- npm dependency resolution and integrity verification mechanisms
- git clone security risks and malicious repository patterns
- HTTP cache poisoning attack vectors and mitigations
- Supply chain attack patterns in package ecosystems

**Never send repository code, secrets, private file paths, or proprietary details to web tools.** Use only public framework, package, API, vulnerability class, and ecosystem convention names.

## Scope

Identify vulnerabilities in:

1. **Remote Skill Fetching and Cache Integrity**: Trace changed code that fetches remote skills (HTTP, git, GitHub API), validates skill content, or writes skill cache. Identify whether remote skill URLs can be manipulated by untrusted input (config, PR, workflow input) to fetch attacker-controlled skills. Check if skill content integrity is verified through signatures, hashes, or pinned versions before execution. Examine whether cache poisoning can substitute a trusted skill with malicious content. Search for remote skill fetching in `src/skills/loader.ts` and cache writing in `src/coordinator/child-skills.ts`.

2. **Skill Provenance and Trust-on-First-Use**: Trace changed code that determines skill provenance (local vs remote, trusted vs untrusted). Identify whether skill source validation can be bypassed or downgraded. Check if trust-on-first-use patterns are vulnerable to race conditions or cache poisoning on first fetch. Examine whether skill signatures or publisher identities are verified. Search for skill source resolution and trust determination in skill loader and config processing.

3. **Untrusted Repository Input Handling**: Trace changed code that processes untrusted repository input (PR title, body, commit messages, file paths, branch names, workflow inputs). Identify whether this input can influence skill selection, execution parameters, cache keys, or output rendering without validation. Check if untrusted input is sanitized before use in prompts, file paths, or subprocess arguments. Examine whether PR metadata can trigger skill execution with elevated privileges. Search for repository input processing in GitHub Action entrypoints, PR metadata handlers, and skill selection logic.

4. **Skill Execution Isolation and Sandboxing**: Trace changed code that spawns skill execution contexts (child processes, SDK runtimes, tool invocations within skills). Identify whether skills execute with full repository access, secrets, or filesystem permissions by default. Check if skill execution is sandboxed or restricted to declared permissions. Examine whether skill output is validated before use in subsequent operations. Search for skill execution in `src/coordinator/agentic.ts`, `src/sdk/analyze.ts`, and skill runtime setup.

5. **Dependency and Supply Chain Integrity**: Trace changed code that installs, resolves, or caches skill dependencies (npm packages, external tools). Identify whether dependency resolution can be influenced by untrusted input to cause dependency confusion or substitution attacks. Check if dependency integrity is verified through lock files, hashes, or signatures. Examine whether skill dependencies are isolated from Warden's own dependencies. Search for dependency installation and resolution in skill loading and setup code.

## Evidence Requirements

For each finding, provide:

- **Changed line anchoring**: The specific changed lines where remote skill URLs, cache keys, or repository input are used without validation
- **Untrusted input source**: (config value, PR metadata, workflow input, repository file)
- **Vulnerable operation**: (remote fetch, cache write, skill selection, execution context, dependency resolution)
- **Concrete attack path**: Show how an attacker with control over the input can substitute malicious skills, poison cache, or escalate privileges
- **Concrete data-flow trace**: From untrusted input (config, PR metadata, workflow input) to vulnerable skill operation
- **Repository source reference**: For existing skill loading patterns (skill loader, cache manager, execution runtime, dependency resolver)
- **Public documentation citation**: For supply chain attack mitigations (npm integrity, git clone safety, HTTP cache poisoning) when behavior affects the attack
- **Realistic impact**: (arbitrary code execution via malicious skill, cache poisoning, supply chain attack, privilege escalation)
- **Smallest safe fix**: (skill signature verification, cache integrity check, input validation, execution sandboxing, dependency pinning)

## Out of Scope

- Generic supply chain hardening unrelated to changed skill loading code
- Recommendations to use different skill distribution mechanisms unless the changed code introduces a new insecure pattern
- Dependency vulnerability reports unless the changed code introduces a new exploitable skill loading path
- Remote skill issues in unchanged code unless new data flow from changed lines triggers the vulnerability
- Theoretical cache poisoning without evidence that changed code affects cache integrity

## Output Requirements

Return findings array with changed-line anchoring and concrete evidence. When evidence is insufficient to confirm a vulnerability, return an empty findings array. Do not report speculative findings.

If repository context is insufficient to determine remote skill risk (e.g., skill provenance verification mechanism, execution sandboxing model, dependency isolation strategy), state the missing context and describe what evidence would be required to confirm or rule out the vulnerability.
