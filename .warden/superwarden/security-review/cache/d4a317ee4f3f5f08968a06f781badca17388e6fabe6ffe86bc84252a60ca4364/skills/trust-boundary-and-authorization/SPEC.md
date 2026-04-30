# Authorization and trust-boundary bypasses in Warden runtime, CLI, and skill loading

## Parent

- Superwarden skill: `security-review`
- Task id: `trust-boundary-and-authorization`

## Scope

Review changed code for authorization failures and trust-boundary crossings in runtime execution, CLI argument handling, GitHub Action inputs, config loading, skill loading, and SDK execution contexts.

## Evidence Requirements

- Changed line(s) performing or conditionally skipping the authorization or trust check
- Data-flow trace from external input to the security-sensitive operation, with changed-line anchors
- Proof that the authorization check is missing, incomplete, or bypassable (e.g., comparison to nearby code, or execution of the check under attacker-controlled conditions)
- Attack path: how an attacker controls the input, what operation is triggered, and what asset or behavior is exposed
- Affected trust boundary (e.g., CLI user vs. Warden runtime, GitHub workflow runner vs. external attacker, local file system vs. remote skill source)
- Realistic impact (e.g., arbitrary skill execution, credential exposure, privilege escalation, unexpected action on external systems)

## Investigation Requirements

- Perform repo-local analysis with Read, Grep, and Glob before reporting.
- Use WebSearch or WebFetch for relevant public prior art, current framework behavior, and security guidance when local source is insufficient.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools.
- Treat missing context as a reason to keep investigating or withhold speculative findings, not as proof of a vulnerability.

## Out of Scope

- Generic authorization design patterns or missing comments
- Speculative permission checks with no triggerable attack path
- Issues that require realistic control of a trusted local developer machine
- Code style or naming clarity
