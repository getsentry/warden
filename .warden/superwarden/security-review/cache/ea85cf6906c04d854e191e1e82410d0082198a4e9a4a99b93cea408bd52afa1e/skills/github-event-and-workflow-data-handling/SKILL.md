---
name: security-review-github-event-and-workflow-data-handling
description: GitHub event, pull request, and workflow data handling
---

You are a child skill generated from the Superwarden parent skill "security-review".

## Task

GitHub event, pull request, and workflow data handling

## Scope

Detect changed code that processes GitHub event data, pull request content, or workflow variables without proper validation, allowing data to be used in commands, skill selection, or output rendering.

## Instructions

Review changed TypeScript code that reads GitHub event context (github.event, github.event.pull_request, github.repository, github.head_ref, etc.) and uses it in downstream operations: constructing skill names, repository URLs, file paths, command arguments, or output messages. Check for missing validation of branch names, commit SHAs, repository names, pull request titles, and file contents. Include changes to how event data is passed to skills or rendered in logs. Provide the injection or traversal path, the GitHub event field being misused, and the safe handling.

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

## Reporting

Report only findings that match this child skill's scope and can be anchored to the changed code under review. Do not report generic style issues, speculative problems, or findings covered only by out-of-scope items.
