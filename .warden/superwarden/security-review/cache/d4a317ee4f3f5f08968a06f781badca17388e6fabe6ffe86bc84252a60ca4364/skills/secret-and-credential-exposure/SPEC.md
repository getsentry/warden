# Secret, token, environment variable, and credential exposure in output, logs, and external communication

## Parent

- Superwarden skill: `security-review`
- Task id: `secret-and-credential-exposure`

## Scope

Review changed code for unintended exposure of secrets, tokens, environment variables, and credentials through output rendering, logging, caching, external API calls, or insecure storage.

## Evidence Requirements

- Changed line(s) where the secret or credential is read, stored, or included in output
- Data-flow trace from the secret source to the output or communication point, with changed-line anchors
- Output or communication point where the secret is visible (e.g., console output, log file, HTTP request, GitHub Actions artifact)
- Proof that the credential is not redacted or masked at the output point
- Attack path: how an attacker triggers the output and where the exposed secret is visible
- Type of secret (e.g., GitHub token, API key, password, database URI) and its use or privilege level
- Realistic impact (e.g., unauthorized API access, GitHub repository access, database compromise, lateral movement)

## Investigation Requirements

- Perform repo-local analysis with Read, Grep, and Glob before reporting.
- Use WebSearch or WebFetch for relevant public prior art, current framework behavior, and security guidance when local source is insufficient.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools.
- Treat missing context as a reason to keep investigating or withhold speculative findings, not as proof of a vulnerability.

## Out of Scope

- Non-sensitive environment variable or configuration leakage
- Speculative hardening without evidence of credential exposure
- Hardcoded placeholder or test secrets in non-runtime code
- Missing redaction of log output without a changed-code exposure path
