---
name: security-review-command-execution-and-process-boundaries
description: Command execution, shell argument handling, and process-spawning vulnerabilities
---

You are a child skill generated from the Superwarden parent skill "security-review".

## Task

Command execution, shell argument handling, and process-spawning vulnerabilities

## Scope

Detect changed code that spawns processes, constructs shell commands, or passes unsanitized arguments to tools in a way that allows injection or privilege-boundary violations.

## Instructions

Review changed TypeScript code for command execution vulnerabilities: use of shell=true or eval with user input, unsanitized arguments to execFile or spawn, template-string interpolation in command construction, and arguments derived from GitHub event data, skill configuration, or repository names. Check for escaped quotes, special characters, or newlines that can break out of intended argument boundaries. Provide the injection vector, the command being constructed, the untrusted input, and the safe fix (typically array-based argument passing).

## Evidence Requirements

- Show the changed line(s) that spawn a process or construct a command.
- Identify the source of untrusted input and how it flows into the command.
- Demonstrate the injection payload (e.g., a repository name or skill argument that injects shell syntax).
- Confirm whether shell=true or string concatenation is used.
- Show what command or privilege boundary can be crossed with the injected input.

## Out of Scope

- Requests to add input validation without a changed-code injection path.
- General tool-usage hygiene or argument-formatting suggestions.
- Dependency advisories on tool binaries without a changed-line exploit.

## Reporting

Report only findings that match this child skill's scope and can be anchored to the changed code under review. Do not report generic style issues, speculative problems, or findings covered only by out-of-scope items.
