# Secret, token, and credential exposure

## Parent

- Superwarden skill: `security-review`
- Task id: `secret-and-credential-exposure`

## Scope

Detect changed code that reads, logs, exports, or renders secrets, tokens, environment variables, or credentials in plaintext or via unencrypted channels.

## Evidence Requirements

- Identify the exact changed line that reads the secret.
- Show the changed line(s) that expose it (console.log, response body, cache write, etc.).
- Trace the data flow from read to exposure.
- Confirm the secret is not redacted, truncated, or encrypted before exposure.
- Specify the observability boundary (filesystem, stdout, network, GitHub logs).

## Out of Scope

- Requests to adopt secrets-management libraries without a changed-code leak.
- Generic hardening of secret handling without demonstrating a new leak vector.
- Dependency security advisories on transitive credential-handling libraries.
