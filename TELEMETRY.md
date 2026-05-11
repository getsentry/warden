---
spec: https://github.com/getsentry/junior/blob/main/TELEMETRY.spec.md
---

# Telemetry

## Goal

Use this when investigating Warden production incidents in the CLI or GitHub
Action. Start with a Sentry event, trace ID, repository, GitHub Action run,
skill or trigger name, file path, finding ID, or model/tool symptom, then use
the recipes below to find the failing run and next query.

Primary backend: Sentry Logs, Issues, Spans/Traces, and Metrics. Local CLI runs
also write `.warden/logs/*.jsonl`; those logs can carry the Sentry `traceId`
when telemetry is enabled.

## Where To Query

| Starting Point | Query Surface | Pivot | Answers | Next Step |
| -------------- | ------------- | ----- | ------- | --------- |
| `trace_id` from CLI summary, JSONL, or `Workflow initialized` | Sentry Traces and Logs | `span_id` | full run timeline, slow/error span | inspect skill or workflow span |
| Sentry `event_id` | Sentry Issues/Event | `trace_id`, `operation`, `trigger.name`, `skill.name` | exception context and owning workflow | query trace logs |
| GitHub repository or Action run | Sentry Logs and Metrics | `warden.repository`, `github.event` | recent Warden runs and trigger count | open matching trace |
| Skill or trigger name | Sentry Spans, Issues, Metrics | `skill.name`, `trigger.name` | failing skill, model cost, finding count | inspect hunk or agent spans |
| File path or hunk | Sentry Spans | `code.filepath`, `hunk.line_range` | hunk analysis state and extraction failures | inspect agent span |
| Model, tool, or token symptom | Sentry Spans | `gen_ai.*`, `gen_ai.tool.name` | Claude turn, tool, cost, and token behavior | inspect child spans |
| Stale comment or fix-eval symptom | Sentry Spans and Metrics | `warden.fix_eval.finding_id`, `warden.fix_eval.verdict` | whether a finding was evaluated or resolved | inspect fix eval span |

## Investigation Pivots

| Pivot | Meaning | Found In | First Query |
| ----- | ------- | -------- | ----------- |
| `trace_id` | one Warden run trace | CLI verbose summary, JSONL, logs, issues, spans | open trace |
| `span_id` | one workflow, skill, hunk, model, or tool span | logs, spans | inspect span |
| `event_id` | captured Sentry error | Sentry issue/event | open event |
| `warden.repository` | repository under review | global attributes, logs, metrics, spans | repo runs |
| `github.event` | Action event name | `workflow.run` span | action entry |
| `trigger.name` | matched Warden trigger | trigger exceptions | trigger failures |
| `skill.name` | configured or resolved skill | spans and issues; metrics use `skill` | skill timeline |
| `code.filepath` | file being analyzed or judged | hunk/file/fix spans | file analysis |
| `gen_ai.conversation.id` | Claude Code SDK session ID | `gen_ai.invoke_agent` span | agent session |
| `warden.fix_eval.finding_id` | finding comment identity | fix evaluation spans | fix verdict |

## Query Recipes

Trace log history after opening a Sentry event, CLI JSONL run, or verbose CLI
summary.

```text
dataset=logs query='trace_id:"<trace_id>"'
fields=timestamp,level,message,trace_id,span_id,warden.repository,skill.name,trigger.name,error.type,exception.message
sort=timestamp
```

Recent GitHub Action runs for a repository.

```text
dataset=logs query='message:"Workflow initialized" warden.repository:"<owner/repo>"'
fields=timestamp,trace_id,github.event,trigger.count,release,environment
sort=-timestamp
```

Skill execution timeline for a slow or failing skill.

```text
dataset=spans query='span.op:skill.run skill.name:"<skill_name>"'
fields=timestamp,trace,span_id,span.duration,skill.name,file.count,error.type
sort=-timestamp
```

File or hunk analysis for a suspicious path.

```text
dataset=spans query='span.op:skill.analyze_hunk code.filepath:"<path>"'
fields=timestamp,trace,span_id,span.duration,skill.name,hunk.line_range,hunk.failed,finding.count,error.type
sort=-timestamp
```

Agent/model calls for token, cost, or provider symptoms.

```text
dataset=spans query='span.op:gen_ai.invoke_agent gen_ai.agent.name:"<skill_name>"'
fields=timestamp,trace,span_id,span.duration,gen_ai.conversation.id,gen_ai.request.model,gen_ai.response.model,gen_ai.usage.total_tokens,gen_ai.cost.total_tokens,error.type
sort=-timestamp
```

Tool calls inside a Claude Code SDK turn.

```text
dataset=spans query='span.op:gen_ai.execute_tool gen_ai.tool.name:"<tool_name>"'
fields=timestamp,trace,span_id,span.duration,gen_ai.tool.name,tool.elapsed_seconds,error.type
sort=-timestamp
```

Captured trigger or workflow exceptions.

```text
dataset=issues query='trigger.name:"<trigger_name>" OR skill.name:"<skill_name>" OR operation:"<operation>"'
fields=timestamp,event_id,trace_id,operation,trigger.name,skill.name,error.type,exception.message
sort=-timestamp
```

Finding fix evaluation and stale comment resolution.

```text
dataset=spans query='span.op:fix_eval.evaluate warden.fix_eval.finding_id:"<finding_id>"'
fields=timestamp,trace,span_id,span.duration,code.filepath,code.line,warden.fix_eval.skill,warden.fix_eval.verdict,warden.fix_eval.used_fallback,error.type
sort=-timestamp
```

Repository-level health and cost.

```text
dataset=metrics query='metric:workflow.runs OR metric:findings.total OR metric:skill.duration OR metric:cost.usd warden.repository:"<owner/repo>"'
fields=timestamp,metric,warden.repository,skill,model,severity,value
sort=-timestamp
```

Total findings for a skill, optionally scoped to a repository.

```text
dataset=metrics query='metric:findings.total skill:"<skill_name>" warden.repository:"<owner/repo>"'
fields=timestamp,metric,warden.repository,skill,model,value
aggregate=sum(value) by skill,warden.repository
```

## Domains

### Workflow Entry

The CLI or GitHub Action did not start, selected no work, or failed while
building repository context.

Events: `Workflow initialized`, top-level CLI/action fatal error

Spans: `workflow.run`, `workflow.init`, `config.load`

Attributes: `trace_id`, `warden.repository`, `warden.source`, `github.event`,
`trigger.count`

### Trigger And GitHub Review

The Action ran, but checks, comments, review posting, or trigger execution
failed.

Events: operation tags `create_core_check`, `fetch_existing_comments`,
`post_thread_reply`, `dismiss_review`, `update_core_check`

Spans: `workflow.setup`, `workflow.execute`, `trigger.execute`,
`workflow.review`

Attributes: `trigger.name`, `skill.name`, `operation`, `warden.repository`

### Skill Analysis

A skill was slow, returned no findings, failed every hunk, or analyzed the
wrong files.

Events: `Skill execution started`, `Skill execution complete`

Spans: `skill.run`, `skill.analyze_file`, `skill.analyze_hunk`

Attributes: `skill.name`, `file.count`, `code.filepath`, `hunk.count`,
`hunk.line_range`, `hunk.failed`, `finding.count`

### Agent And Model

Claude Code SDK execution, Anthropic calls, model choice, tokens, tool use, or
provider failures look wrong.

Events: SDK/runtime errors captured on the owning skill or trigger

Spans: `gen_ai.invoke_agent`, `gen_ai.chat`, `gen_ai.execute_tool`

Attributes: `gen_ai.agent.name`, `gen_ai.conversation.id`,
`gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.usage.input_tokens`,
`gen_ai.usage.output_tokens`, `gen_ai.usage.total_tokens`,
`gen_ai.tool.name`, `tool.elapsed_seconds`

### Finding Pipeline

Findings were extracted, deduplicated, verified, merged, or stripped
unexpectedly.

Events: `Suggested fix quality gate`

Spans: skill spans plus auxiliary `gen_ai.invoke_agent` spans

Metrics: `extraction.attempts`, `extraction.findings`, `dedup.total`,
`dedup.unique`, `dedup.removed`, `fix_gate.checked`,
`fix_gate.stripped_deterministic`, `fix_gate.stripped_semantic`,
`fix_gate.semantic_unavailable`

Attributes: `skill.name` on spans, `skill` and `method` on metrics,
`fix_gate.checked`, `fix_gate.stripped_deterministic`,
`fix_gate.stripped_semantic`, `fix_gate.semantic_unavailable`

### Fix Evaluation And Stale Comments

Existing Warden comments were not resolved, were judged incorrectly, or fix
evaluation failed.

Events: operation tags `fetch_fix_context`, `evaluate_fix_attempts`,
`resolve_stale_comments`

Spans: `workflow.resolve`, `fix_eval.run`, `fix_eval.evaluate`

Attributes: `warden.fix_eval.comment_count`, `warden.fix_eval.finding_id`,
`warden.fix_eval.skill`, `warden.fix_eval.verdict`,
`warden.fix_eval.used_fallback`, `code.filepath`, `code.line`

### Local Run Logs

A local CLI report exists, but the matching Sentry trace or run metadata is
needed.

Events: JSONL records in `.warden/logs/*.jsonl`

Spans: `skill.run`, `skill.analyze_file`, `skill.analyze_hunk`,
`gen_ai.invoke_agent`

Attributes: `traceId` in JSONL, `runId`, `headSha`, `model`, `skill.name`

## Configuration

| Setting | Controls | Default |
| ------- | -------- | ------- |
| `WARDEN_SENTRY_DSN` | Enables Sentry logs, issues, traces, and metrics | disabled |
| `WARDEN_MODEL` | Fallback model recorded on gen AI spans and JSONL | SDK default when unset |
| `WARDEN_ANTHROPIC_API_KEY` | Anthropic auth for CI and auxiliary calls | falls back to `ANTHROPIC_API_KEY` or Claude auth |
| `ANTHROPIC_API_KEY` | Secondary Anthropic auth source | unset |
| `GITHUB_REPOSITORY` | Action repository scope and `warden.repository` | GitHub Actions only |
| `GITHUB_EVENT_NAME` | Action event and `github.event` span attribute | GitHub Actions only |
| CLI `--output` | Explicit JSONL output location | `.warden/logs/` run file |

## Attribute Notes

- `warden.*` fields are Warden-owned local attributes. They are stable query
  handles for this repository, not OpenTelemetry semantic attributes.
- `gen_ai.*` fields follow OpenTelemetry and Sentry AI Agent conventions where
  possible.
- `gen_ai.request.messages` and `gen_ai.response.text` may contain prompt or
  model text. Use IDs, models, tokens, and status fields for triage unless the
  incident specifically requires content inspection.
- `gen_ai.cost.total_tokens` stores SDK-reported USD cost despite the inherited
  attribute name.
- `traceId` in JSONL is the same production pivot as Sentry `trace_id`.

## References

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [OpenTelemetry GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/)
- [Sentry AI Agents module](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/)
- [Sentry JavaScript Node SDK logs](https://docs.sentry.io/platforms/javascript/guides/node/logs/)
