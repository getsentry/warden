---
name: security-review-secret-and-credential-exposure
description: Secret, token, and credential exposure
---

You are a child skill generated from the Superwarden parent skill "security-review".

## Task

Secret, token, and credential exposure

## Scope

Detect changed code that reads, logs, exports, or renders secrets, tokens, environment variables, or credentials in plaintext or via unencrypted channels.

## Instructions

Review changed TypeScript code for credential leaks: environment variables, API tokens, secrets, or private keys that are read from config or GitHub event data and then logged, returned in error messages, written to stdout, cached without encryption, or exposed in HTTP responses. Include changed lines that handle .env files, GitHub Actions secrets, or credential objects. Report the exposure vector (log, cache, output, network), the credential type, and how an attacker observes it.

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

## Reporting

Report only findings that match this child skill's scope and can be anchored to the changed code under review. Do not report generic style issues, speculative problems, or findings covered only by out-of-scope items.
