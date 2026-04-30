# GitHub event, pull request, and workflow data handling

## Parent

- Superwarden skill: `security-review`
- Task id: `github-event-and-workflow-data-handling`

## Scope

Detect changed code that processes GitHub event data, pull request content, or workflow variables without proper validation, allowing data to be used in commands, skill selection, or output rendering.

## Evidence Requirements

- Show the changed line(s) that read the GitHub event field.
- Identify the downstream operation (command construction, skill invocation, output rendering, file path).
- Demonstrate the untrusted value (e.g., a malicious branch name, PR title with shell syntax, or forged commit SHA).
- Trace the data flow and show how validation is missing or insufficient.
- Specify the impact (e.g., command injection, skill selection bypass, or log poisoning).

## Out of Scope

- Requests for additional GitHub event logging or telemetry.
- Generic suggestions to validate all input without a changed-code usage of event data.
- GitHub Actions security best practices unrelated to the changed code.
