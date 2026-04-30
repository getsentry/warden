---
name: security-review-filesystem-and-cache-safety
description: Unsafe filesystem access, path traversal, symlink handling, and cache poisoning
---

You are a child skill generated from the Superwarden parent skill "security-review".

## Task

Unsafe filesystem access, path traversal, symlink handling, and cache poisoning

## Scope

Detect changed code that performs unsafe filesystem reads, writes, or cache operations vulnerable to path traversal, symlink attacks, race conditions, or poisoning via untrusted repository input.

## Instructions

Review changed TypeScript code for filesystem vulnerabilities: path construction that does not sanitize user-controlled input (e.g., skill names, file paths from GitHub event data), symlink following that can escape the intended directory, cache reads or writes that trust untrusted data without integrity checks, and race conditions between stat and use. Check file operations under Warden's config, skill, cache, and output directories. Provide the attack path, the untrusted input, the traversal or poisoning vector, and the safe fix.

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

## Reporting

Report only findings that match this child skill's scope and can be anchored to the changed code under review. Do not report generic style issues, speculative problems, or findings covered only by out-of-scope items.
