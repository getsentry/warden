# Telemetry

Observability via Sentry: tracing, error context, and business metrics. All telemetry is opt-in via `WARDEN_SENTRY_DSN`. When unset, every Sentry call is a no-op.

### Canonical references

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) (attribute names, span structure)
- [OTel GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) (`invoke_agent` attributes)
- [OTel GenAI client spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) (token usage, model, response attributes)
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
| `warden.repository` | After context built | `owner/repo` (e.g. `getsentry/sentry`) |

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
| `gen_ai.system` | `'anthropic'` | Legacy; kept for older Sentry SDK compat |
| `gen_ai.provider.name` | `'anthropic'` | [OTel required](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) (replaces `gen_ai.system`) |
| `gen_ai.agent.name` | Model ID from options | [OTel SHOULD](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) |
| `gen_ai.request.model` | Model ID from options | [OTel conditionally required](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) |
| `gen_ai.request.max_turns` | `maxTurns` value | Warden extension (not in spec) |
| `gen_ai.request.messages` | Stringified `[{role, content}]` array | [Sentry AI Agents](https://docs.sentry.io/platforms/javascript/guides/node/ai-agent-monitoring/). Set on all `gen_ai.*` spans. |

### Response attributes (set after SDK result)

| Attribute | Source | Spec |
|-----------|--------|------|
| `gen_ai.usage.input_tokens` | `input_tokens + cache_read + cache_write` | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/). **Total** input tokens, not just uncached. |
| `gen_ai.usage.output_tokens` | `resultMessage.usage.output_tokens` | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) |
| `gen_ai.usage.input_tokens.cached` | `resultMessage.usage.cache_read_input_tokens` | [Sentry extension](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/). Subset of `input_tokens`. |
| `gen_ai.usage.input_tokens.cache_write` | `resultMessage.usage.cache_creation_input_tokens` | [Sentry extension](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/). Subset of `input_tokens`. |
| `gen_ai.usage.total_tokens` | `input_tokens + output_tokens` (after totaling) | [OTel](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) |
| `gen_ai.cost.total_tokens` | `resultMessage.total_cost_usd` | [Sentry extension](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/). USD cost from SDK. |
| `gen_ai.response.id` | `resultMessage.uuid` | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) |
| `gen_ai.response.model` | First key in `resultMessage.modelUsage` | [OTel recommended](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) |
| `gen_ai.response.text` | Stringified `["response text"]` array | [Sentry AI Agents](https://docs.sentry.io/platforms/javascript/guides/node/ai-agent-monitoring/). Set when response text is available. |

**Token accounting:** The Anthropic API's `input_tokens` field counts only non-cached input tokens. `cache_read_input_tokens` and `cache_creation_input_tokens` are separate, non-overlapping counts. The OTel `gen_ai.usage.input_tokens` attribute represents the *total* input tokens, so we sum all three. Sentry then [subtracts the cached/reasoning counts from the totals](https://docs.sentry.io/platforms/javascript/guides/node/tracing/instrumentation/ai-agents-module/) to compute the raw portion. Setting `input_tokens` to only the non-cached value causes Sentry to compute negative costs.

### SDK-specific attributes

| Attribute | Source |
|-----------|--------|
| `sdk.session_id` | `resultMessage.session_id` |
| `sdk.duration_ms` | `resultMessage.duration_ms` |
| `sdk.duration_api_ms` | `resultMessage.duration_api_ms` |
| `sdk.num_turns` | `resultMessage.num_turns` |

### Per-turn `gen_ai.chat` attributes

Created from `SDKAssistantMessage` events streamed by `query()`. Each span represents a completed API turn within the agent session. Buffered until the next `assistant` or `result` message so tool progress data is captured.

| Attribute | Source | Notes |
|-----------|--------|-------|
| `gen_ai.operation.name` | `'chat'` | OTel operation name |
| `gen_ai.provider.name` | `'anthropic'` | OTel provider |
| `gen_ai.agent.name` | Skill name | Links turn to skill |
| `gen_ai.response.model` | `message.message.model` | Actual model used for this turn |
| `gen_ai.usage.input_tokens` | `input + cache_read + cache_write` | Total input tokens (same accounting as parent) |
| `gen_ai.usage.output_tokens` | `message.message.usage.output_tokens` | Output tokens for this turn |
| `gen_ai.usage.input_tokens.cached` | `message.message.usage.cache_read_input_tokens` | Cache read subset |
| `gen_ai.usage.input_tokens.cache_write` | `message.message.usage.cache_creation_input_tokens` | Cache write subset |
| `gen_ai.usage.total_tokens` | `input + output` | Total tokens for this turn |
| `gen_ai.tool_use.count` | Count of `tool_use` content blocks | Number of tools invoked in this turn |

### Per-tool `gen_ai.execute_tool` attributes

Created from `tool_use` content blocks in `SDKAssistantMessage`, enriched with timing from `SDKToolProgressMessage`. Child spans of `gen_ai.chat`.

| Attribute | Source | Notes |
|-----------|--------|-------|
| `gen_ai.tool.name` | `tool_use.name` | Tool name (e.g. `Read`, `Grep`) |
| `tool.elapsed_seconds` | `SDKToolProgressMessage.elapsed_time_seconds` | Execution duration; only set when progress message received |

### Why manual instrumentation for the SDK

The Claude Code SDK runs as a subprocess via `query()`. It is not an `@anthropic-ai/sdk` client call, so `anthropicAIIntegration` cannot auto-instrument it. The SDK streams rich message types (`SDKAssistantMessage`, `SDKToolProgressMessage`) that provide per-turn token usage and tool execution data. We process these to create `gen_ai.chat` and `gen_ai.execute_tool` child spans. The aggregate result message provides session-level totals for the parent `gen_ai.invoke_agent` span. Direct Anthropic API calls (haiku extraction, fix evaluation judge) *are* auto-instrumented by the integration.

---

## Internal Span Attributes

### `skill.analyze_file`

| Attribute | Type | When set |
|-----------|------|----------|
| `code.filepath` | string | Creation |
| `hunk.count` | number | Creation |
| `finding.count` | number | After loop |
| `hunk.failed_count` | number | After loop |
| `extraction.failed_count` | number | After loop |

### `skill.analyze_hunk`

| Attribute | Type | When set |
|-----------|------|----------|
| `code.filepath` | string | Creation |
| `hunk.line_range` | string | Creation |
| `hunk.failed` | boolean | After result |
| `finding.count` | number | After result |

Retries add a breadcrumb (`category: 'retry'`) with attempt number, error message, and delay.

### `fix_eval.run`

| Attribute | Type | When set |
|-----------|------|----------|
| `fix_eval.comment_count` | number | Creation |
| `fix_eval.evaluated` | number | After loop |
| `fix_eval.resolved` | number | After loop |
| `fix_eval.failed` | number | After loop |
| `fix_eval.skipped` | number | After loop |

### `fix_eval.evaluate`

| Attribute | Type | When set |
|-----------|------|----------|
| `code.filepath` | string | Creation |
| `code.line` | number | Creation |
| `fix_eval.finding_id` | string | Creation |
| `fix_eval.verdict` | string | After result |
| `fix_eval.used_fallback` | boolean | After result |

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
| `resolve_stale_comments` | `evaluateFixesAndResolveStale` | Stale comment resolution |
| `dismiss_review` | `finalizeWorkflow` | Dismissing CHANGES_REQUESTED review |
| `update_core_check` | `finalizeWorkflow` | Updating check run with summary |
| `fetch_fix_context` | `evaluateFixAttempts` | Fetching code at finding location |

Untagged `captureException` calls exist at top-level catch handlers in `src/cli/index.ts`, `src/action/main.ts`, and `src/action/triggers/executor.ts` (tagged with `trigger.name` and `skill.name` instead).

---

## Business Metrics

Emitted via `Sentry.metrics.*`. Each function is a no-op when Sentry is not initialized and wrapped in try/catch so metrics never break the workflow.

All metrics inherit `warden.source` and `warden.repository` from the global scope (see **Global Attributes** above). Only per-metric attributes are listed below.

### Run count (`emitRunMetric`)

| Metric | Type | Per-metric attributes |
|--------|------|-----------------------|
| `workflow.runs` | count | -- (inherits globals) |

Called once per analysis workflow execution (CLI run or GitHub Action workflow).

### Skill-level (`emitSkillMetrics`)

| Metric | Type | Per-metric attributes |
|--------|------|-----------------------|
| `skill.duration` | distribution (ms) | `skill` |
| `tokens.input` | distribution | `skill` |
| `tokens.output` | distribution | `skill` |
| `cost.usd` | distribution | `skill` |
| `findings.total` | count | `skill` |
| `findings` | count | `skill`, `severity` |

### Extraction (`emitExtractionMetrics`)

Called from `parseHunkOutput` in `analyzeHunk`. Tracks regex vs LLM fallback rate.

| Metric | Type | Attributes |
|--------|------|------------|
| `extraction.attempts` | count | `skill`, `method` (`regex` / `llm` / `none`) |
| `extraction.findings` | count | `skill`, `method` |

### Retries (`emitRetryMetric`)

Called from `analyzeHunk` retry block.

| Metric | Type | Attributes |
|--------|------|------------|
| `skill.retries` | count | `skill`, `attempt` |

### Deduplication (`emitDedupMetrics`)

Called from both `runSkill()` and `_runSkillTaskInner()` after `deduplicateFindings`.

| Metric | Type | Attributes |
|--------|------|------------|
| `dedup.total` | distribution | -- |
| `dedup.unique` | distribution | -- |
| `dedup.removed` | distribution | -- (only when total > 0) |

### Fix evaluation (`emitFixEvalMetrics`)

Called from `evaluateFixAttempts` after all evaluations complete.

| Metric | Type | Attributes |
|--------|------|------------|
| `fix_eval.evaluated` | count | -- |
| `fix_eval.resolved` | count | -- |
| `fix_eval.failed` | count | -- |
| `fix_eval.skipped` | count | -- |

### Stale resolution (`emitStaleResolutionMetric`)

Called from `evaluateFixesAndResolveStale` when stale comments are resolved.

| Metric | Type | Attributes |
|--------|------|------------|
| `stale.resolved` | count | -- |

---

## Design Principles

1. **No-op when disabled.** Every function checks `initialized` first. No env var = no overhead.
2. **Never break the workflow.** All metric emission and span attribute setting is wrapped in try/catch. Telemetry failures are swallowed silently.
3. **Follow OTel conventions.** Gen AI spans use `gen_ai.*` ops and standard attribute names so they surface in Sentry's AI Agents dashboard without custom configuration. When OTel and Sentry conventions diverge, follow [Sentry's AI Agents module spec](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/) as the source of truth for what Sentry actually processes.
4. **Set both `gen_ai.system` and `gen_ai.provider.name`.** `gen_ai.provider.name` is the current OTel standard. `gen_ai.system` is kept for backward compatibility with older Sentry SDK versions that may key on it.
5. **Auto-instrument where possible.** Direct Anthropic API calls and HTTP requests are handled by Sentry integrations. Manual spans are only for the Claude Code SDK subprocess and internal orchestration.
6. **Attributes over events.** Prefer span attributes to separate events. Attributes are searchable in Sentry and don't create noise.
7. **Breadcrumbs for retries.** Retry attempts are breadcrumbs (not spans) because they're supplementary context for the parent span, not independent operations.
8. **Tokens are totals, subfields are subsets.** `gen_ai.usage.input_tokens` is the total count including cached. `.cached` and `.cache_write` are subsets that Sentry subtracts to derive the raw portion. Never set the top-level field to only the uncached count.

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
