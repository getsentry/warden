# Remote skill loading, cache integrity, and untrusted repository input

## Parent

- Superwarden skill: `security-review`
- Task id: `remote-skill-loading-and-repository-input`

## Scope

Detect changed code that loads skills from remote repositories, downloads skill code, or processes repository metadata without integrity verification or trust validation.

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
