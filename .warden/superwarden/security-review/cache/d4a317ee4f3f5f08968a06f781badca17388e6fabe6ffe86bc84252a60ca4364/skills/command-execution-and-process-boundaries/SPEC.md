# Command execution, shell argument handling, process spawning, and tool permission boundaries

## Parent

- Superwarden skill: `security-review`
- Task id: `command-execution-and-process-boundaries`

## Scope

Review changed code for unsafe command execution, shell injection, unsafe argument passing, process spawning with overprivileged permissions, and tool boundary violations.

## Evidence Requirements

- Changed line(s) where the command is constructed or the process is spawned
- Source of the user-supplied input included in the command or arguments, with changed-line anchors
- Proof of the injection vulnerability: either a code snippet showing unsanitized interpolation, or comparison to nearby code that sanitizes or escapes input
- Attack path: how an attacker supplies the injection payload, what command is executed, and what code runs with what permissions
- Affected process boundary (e.g., Warden's process vs. external tool, GitHub Actions runner vs. external system, local tool vs. remote service)
- Realistic impact (e.g., arbitrary command execution with Warden's permissions, credential exposure through environment, unauthorized tool invocation)
- Reference to existing command escaping, argument array usage, or input validation patterns in the codebase if the changed code omits them

## Investigation Requirements

- Perform repo-local analysis with Read, Grep, and Glob before reporting.
- Use WebSearch or WebFetch for relevant public prior art, current framework behavior, and security guidance when local source is insufficient.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools.
- Treat missing context as a reason to keep investigating or withhold speculative findings, not as proof of a vulnerability.

## Out of Scope

- Generic command hardening recommendations without evidence of injection
- Speculative execution vectors (e.g., future tool integrations or hypothetical injection sources)
- Tool-specific vulnerability reports not triggered by changed code (e.g., Docker or git CVEs unrelated to how Warden invokes them)
- Issues that require compromise of an installed tool's permissions or binary
