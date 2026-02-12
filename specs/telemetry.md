# Telemetry

Observability via Sentry: tracing, error context, and business metrics. All telemetry is opt-in via `WARDEN_SENTRY_DSN`. When unset, every Sentry call is a no-op.

---

## Initialization

`initSentry(context)` in `src/sentry.ts`. Called once at process start in both CLI and Action entry points.

| Setting | Value |
|---------|-------|
| `release` | `warden@{version}` |
| `environment` | `github-action` or `cli` |
| `tracesSampleRate` | `1.0` (every transaction traced) |
| `enableLogs` | `true` (structured Sentry logs) |

### Integrations

| Integration | Purpose |
|-------------|---------|
| `consoleLoggingIntegration` | Captures `console.warn` / `console.error` as Sentry logs |
| `anthropicAIIntegration` | Auto-instruments `client.messages.create()` in `haiku.ts` / `extract.ts` with gen AI spans |
| `httpIntegration` | Auto-instruments outgoing HTTP (covers all octokit REST/GraphQL calls) |

The Anthropic integration records inputs and outputs (`recordInputs: true, recordOutputs: true`).

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
          gen_ai.invoke_agent "invoke_agent {model}"   ← Sentry AI dashboard
            (auto: anthropic chat spans via integration)
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
| `gen_ai.chat` | Direct Anthropic API calls | Auto-created by `anthropicAIIntegration` |
| `skill.analyze_file` | Per-file orchestration | Internal workflow span |
| `skill.analyze_hunk` | Per-hunk retry loop | Internal workflow span |
| `fix_eval.run` | Fix evaluation batch | Internal workflow span |
| `fix_eval.evaluate` | Single comment evaluation | Internal workflow span |

---

## gen AI Attributes (OTel Conventions)

The `gen_ai.invoke_agent` span on `executeQuery()` carries attributes required for Sentry's AI Agents dashboard and compliant with OTel gen AI semantic conventions.

### Request attributes (set at span creation)

| Attribute | Source | OTel Standard |
|-----------|--------|---------------|
| `gen_ai.operation.name` | `'invoke_agent'` | Yes |
| `gen_ai.system` | `'anthropic'` | Yes (Sentry compat) |
| `gen_ai.provider.name` | `'anthropic'` | Yes (OTel standard) |
| `gen_ai.request.model` | Model ID from options | Yes |
| `gen_ai.request.max_turns` | `maxTurns` value | Extension |

### Response attributes (set after SDK result)

| Attribute | Source | OTel Standard |
|-----------|--------|---------------|
| `gen_ai.usage.input_tokens` | `resultMessage.usage.input_tokens` | Yes |
| `gen_ai.usage.output_tokens` | `resultMessage.usage.output_tokens` | Yes |
| `gen_ai.usage.input_tokens.cached` | `resultMessage.usage.cache_read_input_tokens` | Sentry extension |
| `gen_ai.usage.input_tokens.cache_write` | `resultMessage.usage.cache_creation_input_tokens` | Sentry extension |
| `gen_ai.usage.total_tokens` | Sum of all token fields | Yes |
| `gen_ai.response.id` | `resultMessage.uuid` | Yes |
| `gen_ai.response.model` | First key in `resultMessage.modelUsage` | Yes |

### SDK-specific attributes

| Attribute | Source |
|-----------|--------|
| `sdk.session_id` | `resultMessage.session_id` |
| `sdk.duration_ms` | `resultMessage.duration_ms` |
| `sdk.duration_api_ms` | `resultMessage.duration_api_ms` |
| `sdk.num_turns` | `resultMessage.num_turns` |

### Why manual instrumentation for the SDK

The Claude Code SDK runs as a subprocess via `query()`. It is not an `@anthropic-ai/sdk` client call, so `anthropicAIIntegration` cannot auto-instrument it. The SDK does return rich telemetry in its result message, which we capture manually. Direct Anthropic API calls (haiku extraction, fix evaluation judge) *are* auto-instrumented by the integration.

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

`setFailed()` is an exit mechanism, not error reporting. It flushes pending Sentry events and terminates the process. It does NOT send its own Sentry event. Callers that need Sentry reporting must call `captureException` explicitly before `setFailed`. Expected failures (threshold exceeded, missing env vars, CLI not found) should NOT be reported to Sentry.

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

### Skill-level (`emitSkillMetrics`)

| Metric | Type | Attributes |
|--------|------|------------|
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
3. **Follow OTel conventions.** Gen AI spans use `gen_ai.*` ops and standard attribute names so they surface in Sentry's AI Agents dashboard without custom configuration.
4. **Set both `gen_ai.system` and `gen_ai.provider.name`.** Sentry uses `gen_ai.system`; OTel standard uses `gen_ai.provider.name`. Setting both ensures compatibility.
5. **Auto-instrument where possible.** Direct Anthropic API calls and HTTP requests are handled by Sentry integrations. Manual spans are only for the Claude Code SDK subprocess and internal orchestration.
6. **Attributes over events.** Prefer span attributes to separate events. Attributes are searchable in Sentry and don't create noise.
7. **Breadcrumbs for retries.** Retry attempts are breadcrumbs (not spans) because they're supplementary context for the parent span, not independent operations.

---

## Files

| File | Role |
|------|------|
| `src/sentry.ts` | Init, integrations, metric emission functions |
| `src/sdk/analyze.ts` | `executeQuery` (gen AI span), `analyzeFile` / `analyzeHunk` (workflow spans), extraction + retry + dedup metrics |
| `src/action/fix-evaluation/index.ts` | `evaluateFixAttempts` / per-comment spans, fix eval metrics |
| `src/action/workflow/pr-workflow.ts` | Error context tags, stale resolution metrics |
| `src/cli/output/tasks.ts` | Dedup metrics (CLI code path) |
