# Unsafe filesystem operations, path traversal, symlink handling, and cache poisoning

## Parent

- Superwarden skill: `security-review`
- Task id: `filesystem-and-cache-safety`

## Scope

Review changed code for unsafe filesystem reads, writes, path traversal, symlink attacks, cache integrity violations, and unintended file modifications.

## Evidence Requirements

- Changed line(s) performing the filesystem operation (read, write, mkdir, symlink handling, or cache access)
- Source of the file path: how it is derived from user input or untrusted sources, with changed-line anchors
- Proof of the vulnerability: either a code snippet showing the path traversal or symlink bypass, or comparison to nearby code that validates paths
- Attack path: how an attacker supplies the crafted path, what filesystem operation is triggered, and what file is accessed or modified
- Affected filesystem boundary or asset (e.g., Warden's source, installed skills, system files, or other users' files)
- Realistic impact (e.g., arbitrary file read, arbitrary file write, skill cache poisoning, disclosure of sensitive files)
- Reference to existing path validation, symlink checks, or cache validation patterns in the codebase if the changed code omits them

## Investigation Requirements

- Perform repo-local analysis with Read, Grep, and Glob before reporting.
- Use WebSearch or WebFetch for relevant public prior art, current framework behavior, and security guidance when local source is insufficient.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools.
- Treat missing context as a reason to keep investigating or withhold speculative findings, not as proof of a vulnerability.

## Out of Scope

- Generic path handling or permission checks without a triggerable path traversal or symlink attack
- Speculative hardening (e.g., recommending additional path normalization without proof of bypass)
- Hardcoded paths that cannot be influenced by attacker input
- Issues that require compromise of the local developer machine or Warden's install directory
