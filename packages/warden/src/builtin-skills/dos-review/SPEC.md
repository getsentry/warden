# DoS Review Skill Specification

## Intent

The `dos-review` skill is Warden's availability / denial-of-service reviewer. It owns the resource-exhaustion class that the `security-review` (AppSec) and `code-review` (correctness-in-changes) skills leave uncovered: a single small crafted input that drives unbounded resource use, a hang, or a process-killing abort.

It targets code that parses or processes untrusted, attacker-controlled bytes, and it audits the whole file for latent sinks rather than only diff-scoped regressions.

## Scope

In scope:

- Unbounded memory allocation pre-sized from an attacker-controlled length/size/count field.
- Unbounded decompression (compression bombs) with no output cap.
- Uncontrolled recursion (no depth limit or visited-set) reaching a stack-overflow abort.
- Non-terminating loops following input-controlled pointer/offset chains with no cycle guard.
- Unbounded delegation of untrusted input to third-party parsers/decoders/decompressors that apply no caller-side depth/size/time bound (the unbounded sink lives inside the dependency).
- Resource leaks and panics on untrusted input (missing RAII/finally release, `.unwrap()`/index on input-derived values).
- General guidance across native (Rust/C/C++/Go), JVM, and service code that handles untrusted bytes.

Out of scope:

- AppSec exploitability (injection, XSS, SSRF, auth, secrets) — routed to `security-review`.
- Non-security correctness bugs without a resource-exhaustion or crash impact — routed to `code-review`.
- Performance tuning with no attacker-driven unbounded path.
- Sinks that already have an effective bound on the reachable path.

## Users And Trigger Context

- Primary users: coding agents and Warden runs auditing parsers, format/codec decoders, deserialization, and request-handling code.
- Should trigger for: "DoS review", "resource exhaustion", "decompression bomb", "compression bomb", "uncontrolled recursion", "stack overflow on input", "unbounded allocation", "denial of service", "crash safety", "memory-safety review of untrusted input".
- Should not trigger for: AppSec/OWASP review, generic correctness review, style/architecture review, or Warden CLI usage.

## Runtime Contract

- Required first actions:
  - Identify the untrusted source fields (length/size/count/depth/offset) in the target file.
  - Trace each value to its sink across functions, files, and crates; read the surrounding guards and any sibling path that caps the same primitive.
- Required finding evidence:
  - attacker-controlled source field
  - unbounded sink or missing/after-the-fact bound
  - reachability of the sink from untrusted input
  - impact (allocator/stack abort, hang, OOM, disk fill, or persistent limiter leak), noting whether the crash is an uncatchable process-wide abort
- Required outputs:
  - One finding per distinct root-cause sink; additional reachable paths listed in `verification`, not as separate findings.
  - Severity calibrated: persistent/unrecoverable or core-pipeline = high; recoverable shared worker = medium; bounded = low.
  - Empty findings when no attacker-controlled unbounded path is proven.
- Non-negotiable constraints:
  - Do not report sinks that already have an effective bound.
  - Do not emit one finding per format/call site for the same sink.
  - Do not report AppSec issues here.

## Reference Architecture

- `SKILL.md` contains the review contract, sink-class table, investigation method, dedup rule, severity rubric, and exclusions.
- Add `references/<language>.md` only when recurring findings need language-specific calibration (e.g. Rust allocator-abort vs panic semantics, Go slice make, JVM array pre-sizing).

## Evaluation

- Lightweight validation:
  - Run the skill validator against `src/builtin-skills/dos-review`.
  - Run init command tests that install bundled skills.
- Deeper evaluation:
  - Eval cases per class: unbounded `with_capacity`, decompression bomb, uncontrolled recursion, self-referential pointer-chain loop, RAII/limiter leak on panic, plus safe counterexamples that already carry a cap, depth limit, visited-set, or guard.
  - Confirm dedup: one sink reachable via N formats yields one finding.
- Acceptance gates:
  - `SKILL.md` stays concise.
  - Findings require a proven attacker-controlled unbounded path, not keyword matches.
  - Severity matches the recoverable-vs-persistent rubric.

## Maintenance Notes

- Add a language reference only when recurring findings need language-specific calibration.
- Keep examples minimal and transformed; do not store proprietary code.
- Origin: restores the DoS/resource-exhaustion coverage dropped when the `find-bugs` skill was removed (warden #195); that class was not migrated into `security-review` (AppSec-only) or `code-review` (correctness-in-changes), leaving it unowned.
