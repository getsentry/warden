# Unsafe filesystem access, path traversal, symlink handling, and cache poisoning

## Parent

- Superwarden skill: `security-review`
- Task id: `filesystem-and-cache-safety`

## Scope

Detect changed code that performs unsafe filesystem reads, writes, or cache operations vulnerable to path traversal, symlink attacks, race conditions, or poisoning via untrusted repository input.

## Evidence Requirements

- Show the changed line(s) that construct a file path using unsanitized input.
- Identify the source of untrusted input (query parameter, GitHub event, config file, repository name).
- Demonstrate the traversal path or symlink-following scenario (e.g., ../../../ or symlink to /etc/passwd).
- For cache poisoning, show how malicious data is written and then trusted on subsequent reads.
- Include the filesystem boundary that can be crossed (e.g., Warden home directory, system config).

## Out of Scope

- Requests for atomic file operations or enhanced permissions checks without a changed-line vulnerability.
- Generic file-permission audits or directory ownership checks.
- Speculative hardening against filesystem attacks not triggerable by the changed code.
