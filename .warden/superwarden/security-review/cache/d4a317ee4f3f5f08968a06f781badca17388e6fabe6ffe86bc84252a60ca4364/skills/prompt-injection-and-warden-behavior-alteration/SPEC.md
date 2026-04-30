# Prompt-injection paths that can alter Warden behavior or leak sensitive context

## Parent

- Superwarden skill: `security-review`
- Task id: `prompt-injection-and-warden-behavior-alteration`

## Scope

Review changed code for prompt-injection vulnerabilities where untrusted input could alter Warden's decision-making, skill execution, or leak sensitive context.

## Evidence Requirements

- Changed line(s) where user-supplied input influences Warden's behavior, skill execution, or prompt construction
- Source of the untrusted input (e.g., pull request metadata, CLI argument, or config file) and how it reaches the security-sensitive operation, with changed-line anchors
- Proof of the injection vulnerability: either a code snippet showing unsanitized input in a prompt or decision, or comparison to nearby code that validates or sanitizes input
- Attack path: how an attacker supplies the injection payload, what Warden behavior is altered, and what is the impact (e.g., skill execution, privilege escalation, context leakage)
- Affected Warden boundary or asset (e.g., skill selection, authorization logic, prompt-based AI behavior, or sensitive context in outputs)
- Realistic impact (e.g., unintended skill execution, privilege escalation, sensitive data leakage, behavioral manipulation)
- Reference to existing input validation, sanitization, or safe prompt construction patterns in the codebase if the changed code omits them

## Investigation Requirements

- Perform repo-local analysis with Read, Grep, and Glob before reporting.
- Use WebSearch or WebFetch for relevant public prior art, current framework behavior, and security guidance when local source is insufficient.
- Do not send repository code, secrets, private file paths, or proprietary details to web tools.
- Treat missing context as a reason to keep investigating or withhold speculative findings, not as proof of a vulnerability.

## Out of Scope

- Generic prompt-injection or input-validation hardening without evidence of injectable untrusted input
- Speculative injection vectors in hypothetical AI model usage
- Issues that require the attacker to control a skill's implementation (assume skills are developed by untrusted authors, but do not report Warden failing to prevent a skill from doing what it was asked to do)
- Model-level alignment or behavior issues unrelated to Warden's input handling
