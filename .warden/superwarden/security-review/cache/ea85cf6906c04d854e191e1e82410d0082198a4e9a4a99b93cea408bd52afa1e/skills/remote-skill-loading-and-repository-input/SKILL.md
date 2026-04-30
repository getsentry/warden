---
name: security-review-remote-skill-loading-and-repository-input
description: Remote skill loading, cache integrity, and untrusted repository input
---

You are a child skill generated from the Superwarden parent skill "security-review".

## Task

Remote skill loading, cache integrity, and untrusted repository input

## Scope

Detect changed code that loads skills from remote repositories, downloads skill code, or processes repository metadata without integrity verification or trust validation.

## Instructions

Review changed TypeScript code for remote-skill and repository vulnerabilities: fetching skill code from a repository without verifying a commit hash or signature, using repository names or branches from untrusted sources (GitHub event, user input) to construct fetch URLs, loading and executing cached skill code without re-validating its source, and trusting repository metadata (name, description, topics) as input to Warden operations. Include changes to skill-caching logic, repository cloning, and metadata parsing. Provide the attack vector (MITM, repository hijacking, cache poisoning), the trust assumption violated, and the fix.

## Evidence Requirements

- Identify the changed line(s) that fetch or load remote skill code.
- Show how the repository URL or ref is constructed and whether it includes untrusted input.
- Demonstrate the cache-bypass or re-validation gap (e.g., code is cached but not re-verified on use).
- Specify the attack scenario (e.g., a renamed repository, a hijacked GitHub account, or a forked repository with malicious code).
- Show what code or configuration is executed as a result of the loaded skill.

## Out of Scope

- Recommendations for cryptographic signing without a changed-code loading vulnerability.
- Requests to cache skills differently without a trust or integrity issue in the changed code.
- Generic repository security posture or branch-protection suggestions.

## Reporting

Report only findings that match this child skill's scope and can be anchored to the changed code under review. Do not report generic style issues, speculative problems, or findings covered only by out-of-scope items.
