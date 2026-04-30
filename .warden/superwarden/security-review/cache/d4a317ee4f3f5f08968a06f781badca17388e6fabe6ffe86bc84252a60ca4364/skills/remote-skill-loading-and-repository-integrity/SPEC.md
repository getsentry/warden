# Remote skill loading, cache integrity, and untrusted repository input validation

## Parent

- Superwarden skill: `security-review`
- Task id: `remote-skill-loading-and-repository-integrity`

## Scope

Review changed code for unsafe remote skill loading, repository verification failures, cache poisoning, and untrusted repository input handling.

## Evidence Requirements

- Changed line(s) where the skill URL is resolved, the repository is fetched, or cached skill data is used
- Source of the untrusted input (e.g., user-supplied skill URL, repository reference, or cache key) and how it influences skill loading, with changed-line anchors
- Proof of the vulnerability: either a code snippet showing unvalidated skill sources, or comparison to nearby code that validates or verifies sources
- Attack path: how an attacker supplies a malicious skill URL or poisons the cache, what skill code is loaded, and what code runs with Warden's permissions
- Affected repository or cache boundary (e.g., skill source authenticity, cache isolation, or local filesystem protection)
- Realistic impact (e.g., arbitrary skill code execution, credential exposure, malicious dependency injection, cache poisoning)
- Reference to existing skill source validation, signature verification, or cache integrity checks in the codebase if the changed code omits them

## Investigation Requirements

- Perform repo-local analysis with Read, Grep, and Glob before reporting.
- Use WebSearch or WebFetch for relevant public prior art, current framework behavior, and security guidance when local source is insufficient.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools.
- Treat missing context as a reason to keep investigating or withhold speculative findings, not as proof of a vulnerability.

## Out of Scope

- Generic dependency management or supply-chain hardening without evidence of vulnerable changed code
- Speculative repository attack vectors (e.g., GitHub API compromises, DNS hijacking) not triggered by Warden code
- Dependency freshness or version update recommendations
- Issues that require compromise of Warden's installation or configuration directory
