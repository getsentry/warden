# GitHub event, pull request, and workflow data handling for Warden's GitHub Action

## Parent

- Superwarden skill: `security-review`
- Task id: `github-event-and-workflow-handling`

## Scope

Review changed code for unsafe handling of GitHub event payloads, pull request metadata, workflow context, and external input passed to Warden's GitHub Action.

## Evidence Requirements

- Changed line(s) where GitHub event data is read, processed, or used
- Source of the GitHub event data (e.g., github.event, workflow input, or environment variable) and how it flows into security-sensitive operations, with changed-line anchors
- Proof of the vulnerability: either a code snippet showing unsanitized use of GitHub data, or comparison to nearby code that validates or sanitizes GitHub input
- Attack path: how an attacker creates a pull request or workflow trigger with malicious metadata, what operation is triggered in Warden, and what code or action is executed
- Affected GitHub Actions boundary (e.g., pull request workflow vs. base repository, external fork vs. trusted codebase, Warden permissions vs. intended skill permissions)
- Realistic impact (e.g., arbitrary skill execution, credential or secret exposure, unintended GitHub API operations, code execution with Warden's token permissions)
- Reference to existing GitHub event validation, trust checks, or token isolation patterns in the codebase if the changed code omits them

## Investigation Requirements

- Perform repo-local analysis with Read, Grep, and Glob before reporting.
- Use WebSearch or WebFetch for relevant public prior art, current framework behavior, and security guidance when local source is insufficient.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools.
- Treat missing context as a reason to keep investigating or withhold speculative findings, not as proof of a vulnerability.

## Out of Scope

- Generic GitHub Actions security recommendations without evidence of vulnerable changed code
- Speculative pull request injection vectors not triggered by the changed code
- GitHub Actions platform-level issues or GitHub API design (e.g., token permission scopes set by the workflow, not by Warden code)
- Issues that require compromise of the base repository or Warden's installation
