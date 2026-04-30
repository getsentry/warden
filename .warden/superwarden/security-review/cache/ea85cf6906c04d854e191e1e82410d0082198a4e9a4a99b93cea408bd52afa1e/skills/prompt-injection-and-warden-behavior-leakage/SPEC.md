# Prompt-injection paths that alter Warden behavior or leak sensitive context

## Parent

- Superwarden skill: `security-review`
- Task id: `prompt-injection-and-warden-behavior-leakage`

## Scope

Detect changed code that constructs prompts or skill inputs from untrusted sources (GitHub event, repository content, user input) without proper escaping, allowing prompt injection or context leakage.

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
