# Warden Evals

Behavioral evaluations for the Warden pipeline. These evals verify that Warden
correctly runs skills, invokes the agent, extracts findings, verifies
candidates, and produces the expected outcomes on known code.

## Philosophy

Evals are not unit tests or A/B comparisons. They answer one question:

> **Does the Warden pipeline behave correctly when given known inputs?**

Full-pipeline evals provide code with a known issue, run the Warden agent
pipeline (skill loading, prompt construction, SDK invocation, finding
extraction), and use an LLM judge to verify the output matches behavioral
expectations.

Evals test **Warden's behavior**, not individual skills. Skills are used as
test vehicles to exercise the pipeline. Verifier-only evals isolate Warden's
post-processing decision for one candidate finding.

The only thing mocked is the GitHub event payload. Everything else runs for
real.

## Eval Formats

Small suites can use YAML files at the top level of `packages/evals/`. These are mostly
generic harness smoke suites that use `eval-*` test skills. Product-facing
benchmark suites should prefer one JSON file per scenario under the real skill
name, such as `packages/evals/code-review/` or `packages/evals/security-review/`.

```yaml
skill: skills/bug-detection.md
runtime: pi
model: anthropic/claude-sonnet-4-6

evals:
  - name: null-property-access
    given: code that accesses properties on an array .find() result without null checking
    files:
      - fixtures/null-property-access/handler.ts
    should_find:
      - finding: accessing .name on a potentially undefined user object from Array.find()
        severity: high
    should_not_find:
      - style, formatting, or naming issues
      - the lack of try/catch around the fetch call
```

This reads as:

> **Given** code that accesses properties on an array `.find()` result without
> null checking, Warden **should find** a null access bug and **should not
> find** style issues.

Larger suites should use one JSON file per scenario. The `.eval.ts` file owns
the shared skill/runtime/model defaults, and each JSON file only describes one
case.

```json
{
  "given": "replay detail endpoint grants DELETE to project:read",
  "files": [
    "fixtures/sentry-replay-delete-read-scope/project_replay_details.py"
  ],
  "should_find": [
    {
      "finding": "DELETE accepts project:read scope, so read-only project users can permanently delete replay data"
    }
  ],
  "should_not_find": [
    "missing UUID validation",
    "missing feature flag check"
  ]
}
```

## Eval Structure

```
packages/evals/
├── README.md
├── eval-bug-detection.yaml     # Harness smoke suite using eval-bug-detection
├── eval-security-scanning.yaml # Harness smoke suite using eval-security-scanning
├── eval-precision.yaml         # Harness smoke suite using eval-precision
├── code-review/                # One scenario per code-review correctness case
│   └── robots-prefix-blocks-public-metadata.json
├── security-review/            # One scenario per JSON file
│   └── sentry-replay-delete-read-scope.json
├── verification/               # Candidate findings for verifier-only evals
│   └── workflow-open-periods-project-access-keep.json
├── skills/                     # Test skills (vehicles for exercising pipeline)
│   ├── bug-detection.md
│   ├── security-scanning.md
│   └── precision.md
└── fixtures/                   # Checked-in source code with known issues
    ├── null-property-access/
    │   └── handler.ts
    ├── off-by-one/
    │   └── paginator.ts
    ├── missing-await/
    │   └── cache.ts
    ├── wrong-comparison/
    │   └── validator.ts
    ├── stale-closure/
    │   └── counter.tsx
    ├── sql-injection/
    │   └── api.ts
    ├── xss-reflected/
    │   └── server.ts
    └── ignores-style-issues/
        └── utils.ts
```

Eval test names are formatted as:

```text
<skill>/<case>
```

The suite chooses runtime and model. The current full-pipeline suites run Pi
with `anthropic/claude-sonnet-4-6`; future suites can matrix the same fixtures
over multiple runtimes or models without changing case identity.

The Vitest entrypoints are intentionally split by eval layer:

- `packages/evals/src/e2e.eval.ts`: generic YAML full-pipeline suites.
- `packages/evals/src/code-review.eval.ts`: code-review correctness benchmark scenarios.
- `packages/evals/src/security-review.eval.ts`: security-review benchmark scenarios.
- `packages/evals/src/verify.eval.ts`: verifier-only scenarios from `packages/evals/verification/`.

## YAML Schema

### File-level fields

| Field | Required | Description |
|-------|----------|-------------|
| `skill` | Yes | Path to test skill, relative to `packages/evals/` |
| `runtime` | No | Default runtime for all evals: `claude` or `pi` (default: `claude`) |
| `model` | No | Default model for all evals (default: `claude-sonnet-4-6`; Pi models must use provider/model format, e.g. `anthropic/claude-sonnet-4-6`) |
| `evals` | Yes | List of eval scenarios (at least one) |

### Per-eval fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Scenario name (used in test output) |
| `given` | Yes | What code/situation the eval sets up (BDD "given") |
| `files` | Yes | Fixture files, relative to `packages/evals/` |
| `supporting_files` | No | Context files, relative to `packages/evals/`, copied into the temp repo before the eval diff |
| `model` | No | Model override for this scenario |
| `runtime` | No | Runtime override for this scenario |
| `should_find` | Yes | What the pipeline should detect (at least one) |
| `should_find[].finding` | Yes | Natural language description for the LLM judge |
| `should_find[].severity` | No | Expected severity. When provided, the matched finding must use this exact normalized severity. |
| `should_find[].required` | No | If true (default), eval fails when not found |
| `should_not_find` | No | Things the pipeline should NOT report (precision) |
| `notes` | No | Maintainer-only provenance, ignored by eval execution |
| `notes.repository` | No | Source repository for GitHub-captured fixtures, e.g. `getsentry/sentry` |
| `notes.source_ref` | No | Exact source commit SHA to checkout for reproducing GitHub-captured fixture state |
| `notes.source_files` | No | Mapping from checked-in fixture files to source repository paths at `notes.source_ref` |

Standalone JSON scenario files may omit `name`; it defaults to the JSON
filename without `.json`.

## Verification Evals

Verifier-only evals live in `packages/evals/verification/`. They feed one candidate
finding directly into Warden's verification pass and assert whether it should be
kept or rejected. Use them when a full pipeline eval finds the right issue and a
later verification pass drops it, or when the verifier must reject a known false
positive.

```json
{
  "given": "verifier keeps a concrete authorization finding",
  "files": ["fixtures/example/handler.py"],
  "candidate": {
    "id": "verification-example",
    "severity": "medium",
    "confidence": "medium",
    "title": "Project access is not checked",
    "description": "The endpoint returns project data after only an organization check.",
    "verification": "Source, boundary, sink, and absence of mitigation.",
    "location": {"path": "example/handler.py", "startLine": 10}
  },
  "expect": {"verdict": "keep"}
}
```

## Running Evals

```bash
# Run all evals (requires ANTHROPIC_API_KEY)
pnpm evals

# Run evals for a specific skill
pnpm evals -t "code-review"

# Run a single eval
pnpm evals -t "null-property-access"

# Run the security-review evals
pnpm evals -t "security-review"

# Run the code-review evals
pnpm evals -t "code-review"

# Run verifier-only evals
pnpm evals -t "verification"

# Scaffold a security-review eval from the vulnerable side of a GitHub PR
pnpm evals:scaffold https://github.com/getsentry/sentry/pull/12345
```

Evals make real API calls and are skipped when `ANTHROPIC_API_KEY` is not set.
Suites choose the runtime and model. The checked-in full-pipeline suites
currently run Pi with `anthropic/claude-sonnet-4-6`.

CI runs evals when eval files or harness code change on a PR, when changes land
on `main`, or when a maintainer adds the `run-evals` label to a same-repository
PR. Fork PRs do not receive eval secrets.

Individual eval misses are expected while we tune the harness. CI publishes
JUnit annotations and a job summary for per-case test reporting, then gates the
workflow on the aggregate `Evaluation Results` score. The current baseline
threshold is `0.75`.

## Expected Misses

Eval fixtures are benchmark targets, not proof that the current harness already
passes. When a source finding is verified as a real bug, encode the bug Warden
should find even if the current pipeline misses it, verifies it away, reports a
nearby duplicate, or assigns a different severity. Do not weaken `should_find`
or delete a real bug fixture just to make today's eval run green.

Only remove or avoid a bug fixture when the source finding is not a real,
reachable bug under the skill's criteria. If Warden reports the wrong adjacent
issue, keep the expected assertion focused on the verified bug and use the miss
to improve discovery, verification, merging, or judging later.

## Adding a New Eval

1. Pick an existing skill directory, or create `packages/evals/<skill>/`
2. Add a YAML scenario entry for harness smoke suites or create `packages/evals/<skill>/<scenario>.json`
3. Create checked-in fixture files under `packages/evals/fixtures/<scenario>/`
4. Run `pnpm evals` to verify

If a new category needs a different test skill, add it to `packages/evals/skills/`.
To exercise a built-in directory-format skill, point `skill` at its `SKILL.md`
relative to `packages/evals/`, for example
`../../src/builtin-skills/security-review/SKILL.md`.

### Scaffolding From GitHub

Use `pnpm evals:scaffold <github-pr-url>` to create the fixture files and
standalone JSON stub for a PR. By default it copies the PR's base-side files,
which is usually what you want when the PR fixes a vulnerability and the eval
should exercise the vulnerable code.

```bash
pnpm evals:scaffold https://github.com/getsentry/sentry/pull/12345
pnpm evals:scaffold https://github.com/getsentry/sentry/pull/12345 --name sentry-example-authz
pnpm evals:scaffold https://github.com/getsentry/sentry/pull/12345 --side head
```

The scaffold writes a `TODO` `should_find` assertion. That stub is expected to
fail until you replace it with the exact expected finding, and it should not be
committed as-is.

Source-captured fixtures include source context in their paths:
`packages/evals/fixtures/<scenario>/github/<owner>/<repo>/<repo-relative-path>`.
Eval runs copy them into the temp repo as `<scenario>/<repo-relative-path>` so
test output stays focused on the case and original source file. The source
repository is still included in prompt context and `notes.repository`.
Scaffolded and backfilled source fixtures also record `notes.source_ref` and
`notes.source_files`, so maintainers can recreate the captured source state
with:

```bash
git clone https://github.com/<owner>/<repo>.git
git -C <repo> checkout <notes.source_ref>
git -C <repo> show <notes.source_ref>:<notes.source_files[].sourcePath>
```

Hand-written fixtures can stay shorter when the source repository path is not
useful.

Scaffolded GitHub fixtures also copy the source repository's root LICENSE-like
file into `supporting_files`. Supporting files are available in the temp repo
for provenance and context, but are committed before the eval branch so they do
not appear in the review diff. Scaffolding fails when no root license file can
be found at the captured ref.

When a scaffold skips files, it records them in `notes.skipped_files` and prints
them in CLI output. Review that list before committing the eval.

### Guidelines

- **One bug per eval.** Each scenario tests one specific behavior.
- **Make bugs realistic.** Code should look like something a human wrote.
- **Write precise `should_find`.** "null access on user.name from Array.find()"
  is better than "finds a bug."
- **Include `should_not_find`.** If the code has issues the skill should ignore,
  call them out.
- **Keep fixtures small.** 20-80 lines. The agent analyzes hunks, not novels.
- **No custom code per case.** Every eval case is JSON or YAML + fixture files.

## How It Works

1. **Discovery**: Scan `packages/evals/` for YAML suites and JSON scenario directories
2. **Loading**: Parse YAML/JSON, validate with Zod, resolve paths
3. **Git repo**: Copy checked-in fixtures into a temp repo, preserving paths
   under `packages/evals/fixtures/`, copy supporting files onto `main`, and
   commit fixture files on an `eval` branch, so the agent has a real repo to
   explore
4. **Context**: Build `EventContext` from real `git diff main...eval`
5. **Execution**: Run the skill via `runSkill()` with the real SDK pipeline;
   the agent operates in the temp repo with Read/Grep tools
6. **Judgment**: An LLM judge (Sonnet) evaluates findings against assertions
7. **Verdict**: Pass if all required `should_find` are met and no
   `should_not_find` are violated
