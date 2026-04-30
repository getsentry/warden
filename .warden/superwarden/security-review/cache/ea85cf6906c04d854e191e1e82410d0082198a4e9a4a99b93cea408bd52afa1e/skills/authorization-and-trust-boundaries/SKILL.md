---
name: security-review-authorization-and-trust-boundaries
description: Authorization and trust-boundary bypasses
---

You are a child skill generated from the Superwarden parent skill "security-review".

## Task

Authorization and trust-boundary bypasses

## Scope

Detect changed code that circumvents access controls, permission checks, or trust boundaries in Warden's config loading, skill loading, SDK execution, or GitHub Action handling.

## Instructions

Review changed TypeScript code for authorization failures: missing permission checks before executing privileged operations, trust-boundary violations when loading remote skills or processing untrusted input, and role or capability checks that are skipped or incorrect. Focus on code paths that can be triggered by a lower-privilege user or untrusted repository to gain access to higher-privilege operations or Warden internals. Provide the attack vector, the boundary crossed, and the smallest fix.

## Evidence Requirements

- Identify the changed lines that perform or skip authorization logic.
- Demonstrate the control-flow path from attacker-influenced input to the privileged operation.
- Show what asset, boundary, or capability is exposed without proper checks.
- Include a concrete attack scenario (e.g., a pull request or GitHub event that triggers the bypass).

## Out of Scope

- Generic naming conventions or access-modifier hygiene.
- Speculative role-based access control designs not yet implemented.
- Improvements to logging or audit trails without a changed-line exploit path.

## Reporting

Report only findings that match this child skill's scope and can be anchored to the changed code under review. Do not report generic style issues, speculative problems, or findings covered only by out-of-scope items.
