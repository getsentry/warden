# Warden Evals

End-to-end behavioral evaluations for the Warden pipeline. These evals verify
that Warden correctly runs skills, invokes the agent, extracts findings, and
produces the expected behavioral outcomes on known code.

## Philosophy

Evals are not unit tests or A/B comparisons. They answer one question:

> **Does the Warden pipeline behave correctly when given known inputs?**

Each eval provides code with a known issue, runs the full Warden agent pipeline
(skill loading, prompt construction, SDK invocation, finding extraction), and
uses an LLM judge to verify the output matches behavioral expectations.

Evals test **Warden's behavior**, not individual skills. Skills are used as
test vehicles to exercise the pipeline.

The only thing mocked is the GitHub event payload. Everything else runs for
real.

## Eval Formats

Small suites can use YAML files at the top level of `evals/`. Each file
describes a category of behaviors with a shared test skill and a list of
scenarios.

```yaml
skill: skills/bug-detection.md
runtime: claude
model: claude-sonnet-4-6

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
evals/
├── README.md
├── bug-detection.yaml          # Category: finding logic bugs
├── security-scanning.yaml      # Category: finding security vulnerabilities
├── precision.yaml              # Category: avoiding false positives
├── security-review/            # One scenario per JSON file
│   └── sentry-replay-delete-read-scope.json
├── skills/                     # Test skills (vehicles for exercising pipeline)
│   ├── bug-detection.md
│   ├── security-scanning.md
│   └── precision.md
└── fixtures/                   # Source code with known issues
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

## YAML Schema

### File-level fields

| Field | Required | Description |
|-------|----------|-------------|
| `skill` | Yes | Path to test skill, relative to `evals/` |
| `runtime` | No | Default runtime for all evals: `claude` or `pi` (default: `claude`) |
| `model` | No | Default model for all evals (default: `claude-sonnet-4-6`; Pi models must use provider/model format, e.g. `anthropic/claude-sonnet-4-6`) |
| `evals` | Yes | List of eval scenarios (at least one) |

### Per-eval fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Scenario name (used in test output) |
| `given` | Yes | What code/situation the eval sets up (BDD "given") |
| `files` | Yes | Fixture files, relative to `evals/` |
| `model` | No | Model override for this scenario |
| `runtime` | No | Runtime override for this scenario |
| `should_find` | Yes | What the pipeline should detect (at least one) |
| `should_find[].finding` | Yes | Natural language description for the LLM judge |
| `should_find[].severity` | No | Expected severity. When provided, the matched finding must use this exact normalized severity. |
| `should_find[].required` | No | If true (default), eval fails when not found |
| `should_not_find` | No | Things the pipeline should NOT report (precision) |

Standalone JSON scenario files may omit `name`; it defaults to the JSON
filename without `.json`.

## Running Evals

```bash
# Run all evals (requires ANTHROPIC_API_KEY)
pnpm evals

# Run evals for a specific category
pnpm evals -t "bug-detection"

# Run a single eval
pnpm evals -t "null-property-access"

# Run the security-review evals
pnpm evals -t "security-review"
```

Evals make real API calls. They run skills on the Claude runtime with
`claude-sonnet-4-6` by default. Pi evals should set `runtime: pi` and a
provider-qualified model selector.

## Adding a New Eval

1. Pick an existing YAML suite or scenario directory
2. Add a YAML scenario entry or create `evals/<category>/<scenario>.json`
3. Create fixture files under `evals/fixtures/<scenario>/`
4. Run `pnpm evals` to verify

If a new category needs a different test skill, add it to `evals/skills/`.
To exercise a built-in directory-format skill, point `skill` at its `SKILL.md`
relative to `evals/`, for example
`../src/builtin-skills/security-review/SKILL.md`.

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

1. **Discovery**: Scan `evals/` for YAML suites and JSON scenario directories
2. **Loading**: Parse YAML/JSON, validate with Zod, resolve paths
3. **Git repo**: Create a temp repo with fixture files committed on an `eval`
   branch (empty `main` as base), so the agent has a real repo to explore
4. **Context**: Build `EventContext` from real `git diff main...eval`
5. **Execution**: Run the skill via `runSkill()` with the real SDK pipeline;
   the agent operates in the temp repo with Read/Grep tools
6. **Judgment**: An LLM judge (Sonnet) evaluates findings against assertions
7. **Verdict**: Pass if all required `should_find` are met and no
   `should_not_find` are violated
