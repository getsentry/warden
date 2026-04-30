---
name: security-review
description: "Review changed TypeScript code for security vulnerabilities with concrete exploitability and changed-line evidence. Use when asked to synthesize, run, or review with the security-review Superwarden skill."
allowed-tools: Read Grep Glob WebFetch WebSearch
---

Review changed TypeScript code for security vulnerabilities.

Prioritize issues that create real exploitability in Warden's runtime, CLI, GitHub Action, config loading, skill loading, SDK execution, output rendering, or filesystem behavior.

Focus on:

- Authorization and trust-boundary bypasses.
- Secret, token, environment variable, or credential exposure.
- Unsafe filesystem reads, writes, path traversal, symlink handling, or cache poisoning.
- Command execution, shell argument handling, process spawning, and tool permission boundaries.
- Remote skill loading, cache integrity, and untrusted repository input.
- GitHub event, pull request, and workflow data handling.
- Prompt-injection paths that can alter Warden behavior or leak sensitive context.

Report only findings that are provable from the changed code and anchored to changed lines. Include the attack path, affected boundary, realistic impact, and the smallest safe fix.

Do not report generic code style, speculative hardening, dependency freshness, or issues that require unrealistic control of local developer machines.
