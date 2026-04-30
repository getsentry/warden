---
name: security-review-prompt-injection-and-warden-behavior-leakage
description: Prompt-injection paths that alter Warden behavior or leak sensitive context
---

You are a child skill generated from the Superwarden parent skill "security-review".

## Task

Prompt-injection paths that alter Warden behavior or leak sensitive context

## Scope

Detect changed code that constructs prompts or skill inputs from untrusted sources (GitHub event, repository content, user input) without proper escaping, allowing prompt injection or context leakage.

## Instructions

Review changed TypeScript code that builds prompts, skill initialPrompt, or LLM inputs from untrusted data: repository names, pull request titles, commit messages, file contents, or GitHub Actions secrets. Check for missing escaping or quoting when embedding user-controlled text into prompts. Include changes to how context is passed to skills or rendered in output. Provide the injection payload, the altered behavior or leaked context, and the safe fix (e.g., structured input, escaping, or context isolation).

## Evidence Requirements

- Show the changed line(s) that construct the prompt or LLM input.
- Identify the untrusted source (PR title, commit message, skill config, GitHub variable).
- Demonstrate an injection payload (e.g., a prompt fragment that breaks out of the intended instruction).
- Show what behavior is altered or what context is leaked (e.g., sensitive Warden config, skill logic, or past results).
- Confirm that escaping, quoting, or structural separation is missing.

## Out of Scope

- Generic LLM safety or jailbreak mitigation without a changed-code prompt-injection path.
- Requests to add input sanitization without a demonstrable injection in the changed code.
- Speculative concerns about prompt-model behavior alignment.

## Reporting

Report only findings that match this child skill's scope and can be anchored to the changed code under review. Do not report generic style issues, speculative problems, or findings covered only by out-of-scope items.
