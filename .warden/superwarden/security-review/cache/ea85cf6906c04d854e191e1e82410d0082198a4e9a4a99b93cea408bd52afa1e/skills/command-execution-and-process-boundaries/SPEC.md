# Command execution, shell argument handling, and process-spawning vulnerabilities

## Parent

- Superwarden skill: `security-review`
- Task id: `command-execution-and-process-boundaries`

## Scope

Detect changed code that spawns processes, constructs shell commands, or passes unsanitized arguments to tools in a way that allows injection or privilege-boundary violations.

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
