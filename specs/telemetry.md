# Telemetry

Observability via Sentry: tracing, error context, and business metrics. All telemetry is opt-in via `WARDEN_SENTRY_DSN`. When unset, every Sentry call is a no-op.

### Canonical references

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) (attribute names, span structure)
- [OTel GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) (`invoke_agent` attributes)
- [OTel GenAI client spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) (token usage, model, response attributes)
- [OTel VCS attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/vcs/) (repository attributes)
- [OTel code attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/code/) (source locations)
- [OTel CI/CD attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/cicd/) (Action run attributes)
- [Sentry AI Agents module](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/) (Sentry's source of truth for `gen_ai.*` span processing)
- [Sentry JS AI agent instrumentation](https://docs.sentry.io/platforms/javascript/guides/node/tracing/instrumentation/ai-agents-module/) (practical instrumentation guide)

---

## Initialization

`initSentry(context)` in `src/sentry.ts`. Called once at process start in both CLI and Action entry points.

| Setting | Value |
|---------|-------|
| `release` | `warden@{version}` |
| `environment` | `github-action` or `cli` |
| `tracesSampleRate` | `1.0` (every transaction traced) |
| `enableLogs` | `true` (structured Sentry logs) |

### Global Attributes

Set via `Sentry.getGlobalScope().setAttributes()`. These propagate automatically to all metrics and spans.

| Attribute | Set when | Value |
|-----------|----------|-------|
| `warden.source` | `initSentry()` | `github-action` or `cli` |
| `vcs.owner.name` | After context built | repository owner/org (e.g. `getsentry`) |
| `vcs.repository.name` | After context built | repository name (e.g. `sentry`) |
| `vcs.provider.name` | After context built for GitHub repos | `github` |
| `vcs.repository.url.full` | After context built for GitHub repos | canonical repository URL |
| `github.event.name` | GitHub Actions only | Action event name (GitHub-specific; no OTel equivalent) |
| `cicd.pipeline.name` | GitHub Actions only | GitHub workflow name |
| `cicd.pipeline.run.id` | GitHub Actions only | GitHub workflow run ID |
| `cicd.pipeline.run.url.full` | GitHub Actions only | GitHub workflow run URL |
| `cicd.pipeline.task.name` | GitHub Actions only | GitHub job name |

### Trace ID

The trace ID from the root span serves as the unique run identifier. It is surfaced in:

- **CLI summary** (`-v`): Dimmed `Trace: {id}` line in the SUMMARY section at Verbose+ verbosity
- **CLI debug output** (`-vv`): `reporter.debug()` at the start of the command span (safety net if run crashes before summary)
- **Sentry structured logs**: `trace.id` field in the `Workflow initialized` log entry
- **JSONL run metadata**: `traceId` field in `JsonlRunMetadata`

Operators can use the trace ID to locate the corresponding Sentry trace for any Warden run.

### Integrations

| Integration | Purpose |
|-------------|---------|
| `consoleLoggingIntegration` | Captures `console.warn` / `console.error` as Sentry logs |
| `anthropicAIIntegration` | Auto-instruments `client.messages.create()` in `haiku.ts` / `extract.ts` with gen AI spans |
| `httpIntegration` | Auto-instruments outgoing HTTP (covers all octokit REST/GraphQL calls) |

The Anthropic integration records inputs and outputs (`recordInputs: true, recordOutputs: true`).

**ncc bundling caveat:** `anthropicAIIntegration` and `httpIntegration` rely on `import-in-the-middle` ESM loader hooks, which ncc breaks. In the bundled GitHub Action, only manual `Sentry.startSpan()` traces work. The explicit integrations in `sentry.ts` are effectively dead code in the action context but harmless. They work normally in the unbundled CLI.

---

## Span Hierarchy

Spans follow [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/) where applicable, with Sentry-specific extensions for AI agent visibility.

```
workflow.run "review pull_request"
  workflow.init "initialize workflow"
  workflow.setup "setup github state"
  workflow.execute "execute triggers"
    skill.run "run {skill}"                    ← existing
      skill.analyze_file "analyze file {path}"
        skill.analyze_hunk "analyze hunk {path}:{range}"
          gen_ai.invoke_agent "invoke_agent {skill}"   ← Sentry AI dashboard
            gen_ai.chat "chat {skill} turn 1"          ← per-turn from SDK stream
              gen_ai.execute_tool "Read"                ← tool use from SDK stream
              gen_ai.execute_tool "Grep"
            gen_ai.chat "chat {skill} turn 2"
            gen_ai.chat "chat {skill} turn 3"
              gen_ai.execute_tool "Read"
  workflow.review "post reviews"
  workflow.resolve "resolve stale comments"
    fix_eval.run "evaluate fix attempts"
      fix_eval.evaluate "evaluate fix {path}:{line}"
        (auto: anthropic chat spans via integration)
```

### Span ops

| `op` | Scope | Notes |
|------|-------|-------|
| `gen_ai.invoke_agent` | Claude Code SDK subprocess | Required prefix for Sentry AI Agents dashboard |
| `gen_ai.chat` | Per-turn API call within SDK | Created from `SDKAssistantMessage` stream events; child of `invoke_agent` |
| `gen_ai.execute_tool` | Tool execution within a turn | Created from `SDKAssistantMessage` tool_use blocks + `SDKToolProgressMessage`; child of `gen_ai.chat` |
| `gen_ai.chat` (auto) | Direct Anthropic API calls | Auto-created by `anthropicAIIntegration` for non-SDK calls |
| `skill.analyze_file` | Per-file orchestration | Internal workflow span |
| `skill.analyze_hunk` | Per-hunk retry loop | Internal workflow span |
| `fix_eval.run` | Fix evaluation batch | Internal workflow span |
| `fix_eval.evaluate` | Single comment evaluation | Internal workflow span |

---

## gen AI Attributes

The `gen_ai.invoke_agent` span on `executeQuery()` carries attributes for Sentry's AI Agents dashboard. Attribute names follow OTel GenAI semantic conventions; see [gen-ai-agent-spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) and [gen-ai-spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) for the full specification.

### Request attributes (set at span creation)

| Attribute | Source | Spec |
|-----------|--------|------|
| `gen_ai.operation.name` | `'invoke_agent'` | [OTel required](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) |
| `gen_ai.provider.name` | Runtime/model provider (`anthropic`, `openai`, `pi`, etc.) | [OTel required](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) |
| `gen_ai.agent.name` | Skill name | [OTel SHOULD](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) |
| `gen_ai.request.model` | Model ID from options | [OTel conditionally required](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) |
| `warden.request.max_turns` | `maxTurns` value | Warden extension (not in spec) |
| `gen_ai.system_instructions` | Stringified text instruction parts | OTel GenAI |
| `gen_ai.input.messages` | Stringified normalized message array | OTel GenAI |

### Response attributes (set after SDK result)

| Attribute | Source | Spec |
|-----------|--------|------|
| `gen_ai.usage.input_tokens` | Uncached input + cache read + cache write | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/). **Total** input tokens, not just uncached. |
| `gen_ai.usage.output_tokens` | `resultMessage.usage.output_tokens` | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) |
| `gen_ai.usage.input_tokens.cached` | Cache-read input tokens | Sentry AI Agents |
| `gen_ai.usage.input_tokens.cache_write` | Cache-write input tokens | Sentry AI Agents |
| `gen_ai.usage.total_tokens` | `input_tokens + output_tokens` (after totaling) | OTel GenAI |
| `gen_ai.response.id` | `resultMessage.uuid` | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) |
| `gen_ai.response.model` | Actual response model | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) |
| `gen_ai.response.finish_reasons` | Provider stop reason array | OTel GenAI |
| `gen_ai.output.messages` | Stringified normalized assistant message array | OTel GenAI |

**Token accounting:** Provider usage can split input into uncached input, cache-read input, and cache-write input. Anthropic exposes these as `input_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens`; Pi exposes the same normalized shape as `input`, `cacheRead`, and `cacheWrite`. The `gen_ai.usage.input_tokens` attribute represents the *total* input tokens, so Warden sums all three and records the cache subsets with Sentry's `gen_ai.usage.input_tokens.*` attributes. Setting the top-level field to only the uncached value underreports spend and makes cache accounting ambiguous.

### SDK-specific attributes

| Attribute | Source |
|-----------|--------|
| `gen_ai.conversation.id` | `resultMessage.session_id` |
| `warden.sdk.duration_ms` | `resultMessage.duration_ms` |
| `warden.sdk.duration_api_ms` | `resultMessage.duration_api_ms` |
| `warden.sdk.num_turns` | `resultMessage.num_turns` |

### Per-turn `gen_ai.chat` attributes

Created from `SDKAssistantMessage` events streamed by `query()`. Each span represents a completed API turn within the agent session. Buffered until the next `assistant` or `result` message so tool progress data is captured.

| Attribute | Source | Notes |
|-----------|--------|-------|
| `gen_ai.operation.name` | `'chat'` | OTel operation name |
| `gen_ai.provider.name` | `'anthropic'` | OTel provider |
| `gen_ai.agent.name` | Skill name when available | Links turn to skill |
| `gen_ai.response.model` | `message.message.model` | Actual model used for this turn |
| `gen_ai.usage.input_tokens` | `input + cache_read + cache_write` | Total input tokens (same accounting as parent) |
| `gen_ai.usage.output_tokens` | `message.message.usage.output_tokens` | Output tokens for this turn |
| `gen_ai.usage.input_tokens.cached` | `message.message.usage.cache_read_input_tokens` | Cache read subset |
| `gen_ai.usage.input_tokens.cache_write` | `message.message.usage.cache_creation_input_tokens` | Cache write subset |
| `gen_ai.usage.total_tokens` | `input + output` | Total tokens for this turn |

### Per-tool `gen_ai.execute_tool` attributes

Created from `tool_use` content blocks in `SDKAssistantMessage`, enriched with timing from `SDKToolProgressMessage`. Child spans of `gen_ai.chat`.

| Attribute | Source | Notes |
|-----------|--------|-------|
| `gen_ai.operation.name` | `'execute_tool'` | OTel operation name |
| `gen_ai.agent.name` | Skill name when available | Links tool use to skill |
| `gen_ai.tool.name` | `tool_use.name` | Tool name (e.g. `Read`, `Grep`) |

When the SDK reports tool elapsed time, Warden sets the tool span start/end time
so duration is represented by `span.duration`.

### Structured `gen_ai.chat` attributes

Direct structured model calls (`runAuxiliary` / `runSynthesis`) create manual
`gen_ai.chat` spans so the bundled action has coverage even when loader-based
auto-instrumentation is unavailable.

| Attribute | Source | Notes |
|-----------|--------|-------|
| `gen_ai.operation.name` | `'chat'` | OTel operation name |
| `gen_ai.provider.name` | Runtime/model provider (`anthropic`, `openai`, `pi`, etc.) | OTel provider |
| `gen_ai.agent.name` | Request `agentName` when available | Links the call to the originating skill or builder agent |
| `warden.ai.task` | Request `task` | Warden task name (`extraction`, `deduplication`, `fix_quality`, `fix_evaluation`, `consolidation`, or `skill_build`) |
| `gen_ai.request.model` | Requested model | Model sent to the runtime provider |

Structured tool-loop calls also create `gen_ai.execute_tool` child spans with
`gen_ai.operation.name`, `gen_ai.agent.name`, `warden.ai.task`, and
`gen_ai.tool.name`.

### Why manual instrumentation for the SDK

The Claude Code SDK runs as a subprocess via `query()`. It is not an `@anthropic-ai/sdk` client call, so `anthropicAIIntegration` cannot auto-instrument it. The SDK streams rich message types (`SDKAssistantMessage`, `SDKToolProgressMessage`) that provide per-turn token usage and tool execution data. We process these to create `gen_ai.chat` and `gen_ai.execute_tool` child spans. The aggregate result message provides session-level totals for the parent `gen_ai.invoke_agent` span. Direct structured Anthropic calls are also wrapped manually because the bundled GitHub Action cannot rely on loader-based auto-instrumentation.

---

## Internal Span Attributes

### `workflow.run`

| Attribute | Type | When set |
|-----------|------|----------|
| `warden.trigger.count` | number | After trigger matching |
| `warden.finding.count` | number | After result |

### `skill.run`

| Attribute | Type | When set |
|-----------|------|----------|
| `gen_ai.agent.name` | string | Creation and after skill resolution |
| `warden.trigger.name` | string | Creation for trigger-backed runs |
| `warden.file.count` | number | Creation |
| `warden.finding.count` | number | After result |

### `skill.analyze_file`

The parent `skill.run` span carries `gen_ai.agent.name` for every run and
`warden.trigger.name` only when the skill was selected by an actual trigger.
Direct CLI skill runs omit trigger metadata. Child file and hunk spans also
carry `gen_ai.agent.name` so skill-scoped span queries do not depend on parent
span context propagation.

| Attribute | Type | When set |
|-----------|------|----------|
| `code.file.path` | string | Creation |
| `warden.hunk.count` | number | Creation |
| `warden.finding.count` | number | After loop |
| `warden.hunk.failed_count` | number | After loop |
| `warden.extraction.failed_count` | number | After loop |

### `skill.analyze_hunk`

| Attribute | Type | When set |
|-----------|------|----------|
| `code.file.path` | string | Creation |
| `warden.hunk.line_range` | string | Creation |
| `warden.hunk.failed` | boolean | After result |
| `warden.finding.count` | number | After result |

Retries add a breadcrumb (`category: 'retry'`) with attempt number, error message, and delay.

### `fix_eval.run`

| Attribute | Type | When set |
|-----------|------|----------|
| `warden.fix_eval.comment_count` | number | Creation |
| `warden.fix_eval.evaluated` | number | After loop |
| `warden.fix_eval.resolved` | number | After loop |
| `warden.fix_eval.failed` | number | After loop |
| `warden.fix_eval.skipped` | number | After loop |

### `fix_eval.evaluate`

| Attribute | Type | When set |
|-----------|------|----------|
| `code.file.path` | string | Creation |
| `code.line.number` | number | Creation |
| `warden.fix_eval.finding_id` | string | Creation from Warden comment metadata |
| `gen_ai.agent.name` | string | Creation from Warden comment metadata |
| `warden.fix_eval.raw_verdict` | string | Judge result before Warden overrides |
| `warden.fix_eval.verdict` | string | Final outcome after re-detection and fallback handling |
| `warden.fix_eval.used_fallback` | boolean | After result |

---

## Error Reporting

`Sentry.captureException` is reserved for real errors: unexpected failures where something went wrong. Every call represents a genuine exception that we want to see in Sentry's Issues stream. We never override the `level` parameter. If something isn't worth reporting as an error, don't call `captureException` at all.

Non-fatal errors (the workflow continues despite the failure) are still real errors. A GitHub API call that 500s is an error whether or not we can recover from it.

`setFailed()` throws `ActionFailedError`, which propagates out of `Sentry.startSpan()` callbacks so spans end cleanly before the process exits. The top-level catch handler in `src/action/main.ts` distinguishes `ActionFailedError` (expected failure: threshold exceeded, missing env, CLI not found) from unexpected errors. Only unexpected errors call `captureException`. Both paths call `flushSentry()` then `process.exit(1)`.

### Operation tags

All `captureException` calls include an `operation` tag for filtering in Sentry issues.

| Tag value | Location | What failed |
|-----------|----------|-------------|
| `read_event_payload` | `initializeWorkflow` | Reading GitHub event JSON |
| `build_event_context` | `initializeWorkflow` | Parsing event into context |
| `create_core_check` | `setupGitHubState` | Creating the GitHub check run |
| `fetch_existing_comments` | `postReviewsAndTrackFailures` | Fetching PR comments for dedup |
| `post_thread_reply` | `evaluateFixesAndResolveStale` | Posting fix evaluation reply |
| `evaluate_fix_attempts` | `evaluateFixesAndResolveStale` | Fix evaluation batch |
| `evaluate_fix_attempt` | `evaluateFixAttempts` | Per-comment fix evaluation |
| `resolve_stale_comments` | `evaluateFixesAndResolveStale` | Stale comment resolution |
| `dismiss_review` | `finalizeWorkflow` | Dismissing CHANGES_REQUESTED review |
| `update_core_check` | `finalizeWorkflow` | Updating check run with summary |
| `fetch_fix_context` | `evaluateFixAttempts` | Fetching code at finding location |

Untagged `captureException` calls exist at top-level catch handlers in `src/cli/index.ts`, `src/action/main.ts`, and `src/action/triggers/executor.ts` (tagged with `warden.trigger.name` and `gen_ai.agent.name` instead).

---

## Business Metrics

Emitted via `Sentry.metrics.*`. Each function is a no-op when Sentry is not initialized and wrapped in try/catch so metrics never break the workflow.

All metrics inherit `warden.source`, repository attributes, and GitHub Actions attributes from the global scope (see **Global Attributes** above). Only per-metric attributes are listed below.

### Run count (`emitRunMetric`)

| Metric | Type | Per-metric attributes |
|--------|------|-----------------------|
| `warden.workflow.runs` | count | -- (inherits globals) |

Called once per analysis workflow execution (CLI run or GitHub Action workflow).

### Skill-level (`emitSkillMetrics`)

Called once per completed skill report from both CLI/PR task execution and
scheduled workflow execution.

| Metric | Type | Per-metric attributes |
|--------|------|-----------------------|
| `warden.skill.duration` | distribution (ms) | `gen_ai.agent.name`, `gen_ai.request.model`, `warden.runtime.name` |
| `gen_ai.client.token.usage` | distribution (`{token}`) | `gen_ai.agent.name`, `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.token.type`, `warden.runtime.name` |
| `warden.gen_ai.cost.usd` | distribution | `gen_ai.agent.name`, `gen_ai.request.model`, `warden.runtime.name` |
| `warden.findings` | count | `gen_ai.agent.name`, `gen_ai.request.model`, `warden.runtime.name`, `warden.finding.severity` |

`gen_ai.request.model` is included when `report.model` is set (i.e. when the caller specifies a model). `warden.runtime.name` is included when the report runtime is known (`claude` or `pi`).

### Extraction (`emitExtractionMetrics`)

Called from `parseHunkOutput` in `analyzeHunk`. Tracks regex vs LLM fallback rate.

| Metric | Type | Attributes |
|--------|------|------------|
| `warden.extraction.attempts` | count | `gen_ai.agent.name`, `warden.extraction.method` (`regex` / `llm` / `none`) |
| `warden.extraction.findings` | count | `gen_ai.agent.name`, `warden.extraction.method` |

### Retries (`emitRetryMetric`)

Called from `analyzeHunk` retry block.

| Metric | Type | Attributes |
|--------|------|------------|
| `warden.skill.retries` | count | `gen_ai.agent.name`, `warden.retry.attempt` |

### Fix gate (`emitFixGateMetrics`)

Called from both `runSkill()` and `runSkillTask()` after `sanitizeFindingsSuggestedFixes`.

| Metric | Type | Attributes |
|--------|------|------------|
| `warden.fix_gate.checked` | count | `gen_ai.agent.name` |
| `warden.fix_gate.stripped_deterministic` | count | `gen_ai.agent.name` |
| `warden.fix_gate.stripped_semantic` | count | `gen_ai.agent.name` |
| `warden.fix_gate.semantic_unavailable` | count | `gen_ai.agent.name` |

### Deduplication (`emitDedupMetrics`)

Called from both `runSkill()` and `runSkillTask()` after `deduplicateFindings`.

| Metric | Type | Attributes |
|--------|------|------------|
| `warden.dedup.total` | distribution | `gen_ai.agent.name` |
| `warden.dedup.unique` | distribution | `gen_ai.agent.name` |
| `warden.dedup.removed` | distribution | `gen_ai.agent.name` (only when total > 0) |

### Fix evaluation (`emitFixEvalMetrics`)

Called from `evaluateFixAttempts` after all evaluations complete.

| Metric | Type | Attributes |
|--------|------|------------|
| `warden.fix_eval.evaluated` | count | -- |
| `warden.fix_eval.resolved` | count | -- |
| `warden.fix_eval.failed` | count | -- |
| `warden.fix_eval.skipped` | count | -- |
| `warden.fix_eval.unique_findings.evaluated` | count | -- |
| `warden.fix_eval.unique_findings.code_changed` | count | -- |
| `warden.fix_eval.unique_findings.resolved` | count | -- |
| `warden.fix_eval.verdict` | count | `warden.fix_eval.verdict`, `warden.fix_eval.used_fallback`, `gen_ai.agent.name` |

The aggregate metrics above are emitted once per run. The per-verdict metric is emitted after each individual evaluation with the final verdict (`resolved`, `attempted_failed`, `not_attempted`, `re_detected`, `eval_error`), whether fallback was used, and the originating skill name.

### Stale resolution (`emitStaleResolutionMetric`)

Called from `evaluateFixesAndResolveStale` when stale comments are resolved. Emitted once as a total (no skill attribute) and once per skill for comments that have a skill attribution.

| Metric | Type | Attributes |
|--------|------|------------|
| `warden.stale.resolved` | count | `gen_ai.agent.name` (optional) |

---

## Design Principles

1. **No-op when disabled.** Every function checks `initialized` first. No env var = no overhead.
2. **Never break the workflow.** All metric emission and span attribute setting is wrapped in try/catch. Telemetry failures are swallowed silently.
3. **Follow OTel conventions.** Use OTel semantic attributes (`vcs.*`, `code.*`, `cicd.*`, `gen_ai.*`) where they exist. Use `warden.*` only for Warden-specific concepts that OTel does not define. When OTel and Sentry conventions diverge, follow [Sentry's AI Agents module spec](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/) as the source of truth for what Sentry actually processes.
4. **Do not emit compatibility aliases.** The same concept must have one canonical attribute name. Breaking telemetry queries is preferable to preserving conflicting semantics.
5. **Auto-instrument where possible.** Direct provider API calls and HTTP requests are handled by Sentry integrations where available. Manual spans are only for coding-agent runtime wrappers and internal orchestration.
6. **Attributes over events.** Prefer span attributes to separate events. Attributes are searchable in Sentry and don't create noise.
7. **Breadcrumbs for retries.** Retry attempts are breadcrumbs (not spans) because they're supplementary context for the parent span, not independent operations.
8. **Tokens are totals, subfields are subsets.** `gen_ai.usage.input_tokens` is the total count including cached input. `gen_ai.usage.input_tokens.cached` and `gen_ai.usage.input_tokens.cache_write` are subsets. Never set the top-level field to only the uncached count.

---

## Files

| File | Role |
|------|------|
| `src/sentry.ts` | Init, integrations, global attributes, metric emission functions |
| `src/sdk/analyze.ts` | `executeQuery` (gen AI span), `analyzeFile` / `analyzeHunk` (workflow spans), extraction + retry + dedup metrics |
| `src/action/fix-evaluation/index.ts` | `evaluateFixAttempts` / per-comment spans, fix eval metrics |
| `src/action/workflow/base.ts` | `ActionFailedError` sentinel, `setFailed()` |
| `src/action/main.ts` | Top-level catch handler, Sentry flush, `process.exit` |
| `src/action/workflow/pr-workflow.ts` | Error context tags, stale resolution metrics |
| `src/cli/output/tasks.ts` | Dedup metrics (CLI code path) |
