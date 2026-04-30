# Authorization and trust-boundary bypasses

## Parent

- Superwarden skill: `security-review`
- Task id: `authorization-and-trust-boundaries`

## Scope

Detect changed code that circumvents access controls, permission checks, or trust boundaries in Warden's config loading, skill loading, SDK execution, or GitHub Action handling.

## Evidence Requirements

- Identify the changed lines that perform or skip authorization logic.
- Demonstrate the control-flow path from attacker-influenced input to the privileged operation.
- Show what asset, boundary, or capability is exposed without proper checks.
- Include a concrete attack scenario (e.g., a pull request or GitHub event that triggers the bypass).

## Out of Scope

- Generic naming conventions or access-modifier hygiene.
- Speculative role-based access control designs not yet implemented.
- Improvements to logging or audit trails without a changed-line exploit path.
