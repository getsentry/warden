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
| Sentry `event_id` | Sentry Issues/Event | `trace_id`, `operation`, `warden.trigger.name`, `gen_ai.agent.name` | exception context and owning workflow | query trace logs |
| GitHub repository or Action run | Sentry Logs and Metrics | `vcs.owner.name`, `vcs.repository.name`, `cicd.pipeline.run.id`, `github.event.name` | recent Warden runs and trigger count | open matching trace |
| Skill or trigger name | Sentry Spans, Issues, Metrics | `gen_ai.agent.name`, `warden.trigger.name` | failing skill, model cost, finding count | inspect hunk or agent spans |
| File path or hunk | Sentry Spans | `code.file.path`, `warden.hunk.line_range` | hunk analysis state and extraction failures | inspect agent span |
| Model, tool, or token symptom | Sentry Spans | `gen_ai.*`, `gen_ai.tool.name` | Claude turn, tool, cost, and token behavior | inspect child spans |
| Stale comment or fix-eval symptom | Sentry Spans and Metrics | `warden.fix_eval.finding_id`, `warden.fix_eval.verdict` | whether a finding was evaluated or resolved | inspect fix eval span |

## Investigation Pivots

| Pivot | Meaning | Found In | First Query |
| ----- | ------- | -------- | ----------- |
| `trace_id` | one Warden run trace | CLI verbose summary, JSONL, logs, issues, spans | open trace |
| `span_id` | one workflow, skill, hunk, model, or tool span | logs, spans | inspect span |
| `event_id` | captured Sentry error | Sentry issue/event | open event |
| `vcs.repository.name` | repository name | global attributes, logs, metrics, spans | repo runs |
| `vcs.owner.name` | repository owner or org | global attributes, logs, metrics, spans | repo runs |
| `vcs.repository.url.full` | canonical repository URL | global attributes, logs, metrics, spans | exact repo runs |
| `github.event.name` | Action event name | `workflow.run` span | action entry |
| `cicd.pipeline.run.id` | GitHub Actions run ID | global attributes, logs, metrics, spans | action run |
| `cicd.pipeline.run.url.full` | GitHub Actions run URL | global attributes, logs, metrics, spans | action run |
| `warden.trigger.name` | matched Warden trigger | trigger exceptions | trigger failures |
| `gen_ai.agent.name` | configured or resolved skill/agent | spans, issues, metrics | skill timeline |
| `code.file.path` | file being analyzed or judged | hunk/file/fix spans | file analysis |
| `gen_ai.conversation.id` | Claude Code SDK session ID | `gen_ai.invoke_agent` span | agent session |
| `warden.fix_eval.finding_id` | finding comment identity | fix evaluation spans | fix verdict |

## Query Recipes

Trace log history after opening a Sentry event, CLI JSONL run, or verbose CLI
summary.

```text
dataset=logs query='trace_id:"<trace_id>"'
fields=timestamp,level,message,trace_id,span_id,vcs.owner.name,vcs.repository.name,gen_ai.agent.name,warden.trigger.name,error.type,exception.message
sort=timestamp
```

Recent GitHub Action runs for a repository.

```text
dataset=logs query='message:"Workflow initialized" vcs.owner.name:"<owner>" vcs.repository.name:"<repo>"'
fields=timestamp,trace_id,github.event.name,cicd.pipeline.run.id,cicd.pipeline.run.url.full,warden.trigger.count,release,environment
sort=-timestamp
```

Skill execution timeline for a slow or failing skill.

```text
dataset=spans query='span.op:skill.run gen_ai.agent.name:"<skill_name>"'
fields=timestamp,trace,span_id,span.duration,gen_ai.agent.name,warden.trigger.name,warden.file.count,error.type
sort=-timestamp
```

`warden.trigger.name` is present only for trigger-backed runs. Direct CLI skill
runs have `gen_ai.agent.name` without trigger metadata.

File or hunk analysis for a suspicious path.

```text
dataset=spans query='span.op:skill.analyze_hunk code.file.path:"<path>"'
fields=timestamp,trace,span_id,span.duration,gen_ai.agent.name,warden.hunk.line_range,warden.hunk.failed,warden.finding.count,error.type
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
dataset=issues query='warden.trigger.name:"<trigger_name>" OR gen_ai.agent.name:"<skill_name>" OR operation:"<operation>"'
fields=timestamp,event_id,trace_id,operation,warden.trigger.name,gen_ai.agent.name,error.type,exception.message
sort=-timestamp
```

Finding fix evaluation and stale comment resolution.

```text
dataset=spans query='span.op:fix_eval.evaluate warden.fix_eval.finding_id:"<finding_id>"'
fields=timestamp,trace,span_id,span.duration,code.file.path,code.line.number,gen_ai.agent.name,warden.fix_eval.verdict,warden.fix_eval.used_fallback,error.type
sort=-timestamp
```

Repository-level health and cost.

```text
dataset=metrics query='metric:warden.workflow.runs OR metric:warden.findings OR metric:warden.skill.duration OR metric:warden.gen_ai.cost.usd vcs.owner.name:"<owner>" vcs.repository.name:"<repo>"'
fields=timestamp,metric,vcs.owner.name,vcs.repository.name,cicd.pipeline.run.id,gen_ai.agent.name,gen_ai.request.model,warden.finding.severity,value
sort=-timestamp
```

Total findings for a skill, optionally scoped to a repository.

```text
dataset=metrics query='metric:warden.findings gen_ai.agent.name:"<skill_name>" vcs.owner.name:"<owner>" vcs.repository.name:"<repo>"'
fields=timestamp,metric,vcs.owner.name,vcs.repository.name,gen_ai.agent.name,warden.finding.severity,value
aggregate=sum(value) by gen_ai.agent.name,vcs.owner.name,vcs.repository.name
```

## Domains

### Workflow Entry

The CLI or GitHub Action did not start, selected no work, or failed while
building repository context.

Events: `Workflow initialized`, top-level CLI/action fatal error

Spans: `workflow.run`, `workflow.init`, `config.load`

Attributes: `trace_id`, `vcs.owner.name`, `vcs.repository.name`,
`vcs.repository.url.full`, `warden.source`, `github.event.name`,
`cicd.pipeline.name`, `cicd.pipeline.run.id`,
`cicd.pipeline.run.url.full`, `warden.trigger.count`

### Trigger And GitHub Review

The Action ran, but checks, comments, review posting, or trigger execution
failed.

Events: operation tags `create_core_check`, `fetch_existing_comments`,
`post_thread_reply`, `dismiss_review`, `update_core_check`

Spans: `workflow.setup`, `workflow.execute`, `trigger.execute`,
`workflow.review`

Attributes: `warden.trigger.name`, `gen_ai.agent.name`, `operation`,
`vcs.owner.name`, `vcs.repository.name`

### Skill Analysis

A skill was slow, returned no findings, failed every hunk, or analyzed the
wrong files.

Events: `Skill execution started`, `Skill execution complete`

Spans: `skill.run`, `skill.analyze_file`, `skill.analyze_hunk`

Attributes: `gen_ai.agent.name`, `warden.file.count`, `code.file.path`,
`warden.hunk.count`, `warden.hunk.line_range`, `warden.hunk.failed`,
`warden.finding.count`

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

Metrics: `warden.extraction.attempts`, `warden.extraction.findings`,
`warden.dedup.total`, `warden.dedup.unique`, `warden.dedup.removed`,
`warden.fix_gate.checked`, `warden.fix_gate.stripped_deterministic`,
`warden.fix_gate.stripped_semantic`, `warden.fix_gate.semantic_unavailable`

Attributes: `gen_ai.agent.name`, `warden.extraction.method`,
`warden.fix_gate.checked`, `warden.fix_gate.stripped_deterministic`,
`warden.fix_gate.stripped_semantic`, `warden.fix_gate.semantic_unavailable`

### Fix Evaluation And Stale Comments

Existing Warden comments were not resolved, were judged incorrectly, or fix
evaluation failed.

Events: operation tags `fetch_fix_context`, `evaluate_fix_attempts`,
`resolve_stale_comments`

Spans: `workflow.resolve`, `fix_eval.run`, `fix_eval.evaluate`

Attributes: `warden.fix_eval.comment_count`, `warden.fix_eval.finding_id`,
`gen_ai.agent.name`, `warden.fix_eval.verdict`,
`warden.fix_eval.used_fallback`, `code.file.path`, `code.line.number`

### Local Run Logs

A local CLI report exists, but the matching Sentry trace or run metadata is
needed.

Events: JSONL records in `.warden/logs/*.jsonl`

Spans: `skill.run`, `skill.analyze_file`, `skill.analyze_hunk`,
`gen_ai.invoke_agent`

Attributes: `traceId` in JSONL, `runId`, `headSha`, `model`,
`gen_ai.agent.name` in telemetry

## Configuration

| Setting | Controls | Default |
| ------- | -------- | ------- |
| `WARDEN_SENTRY_DSN` | Enables Sentry logs, issues, traces, and metrics | disabled |
| `WARDEN_MODEL` | Fallback model recorded on gen AI spans and JSONL | SDK default when unset |
| `WARDEN_ANTHROPIC_API_KEY` | Anthropic auth for CI and auxiliary calls | falls back to `ANTHROPIC_API_KEY` or Claude auth |
| `ANTHROPIC_API_KEY` | Secondary Anthropic auth source | unset |
| `GITHUB_REPOSITORY` | Action repository scope for `vcs.*` attributes | GitHub Actions only |
| `GITHUB_EVENT_NAME` | Action event and `github.event.name` attribute | GitHub Actions only |
| `GITHUB_RUN_ID` | Action run scope for `cicd.pipeline.run.*` attributes | GitHub Actions only |
| `GITHUB_WORKFLOW` | Action workflow name for `cicd.pipeline.name` | GitHub Actions only |
| `GITHUB_JOB` | Action job name for `cicd.pipeline.task.name` | GitHub Actions only |
| CLI `--output` | Explicit JSONL output location | `.warden/logs/` run file |

## Attribute Notes

- `vcs.*`, `code.*`, and `gen_ai.*` fields follow OpenTelemetry semantic
  conventions where applicable.
- `cicd.*` fields follow OpenTelemetry CI/CD semantic conventions for GitHub
  Actions run metadata where there is a direct match.
- `warden.*` fields are Warden-owned local attributes for concepts that do not
  have OpenTelemetry semantic attributes, such as triggers, hunks, finding
  counts, and fix evaluation.
- `github.event.name` is GitHub-specific because OpenTelemetry does not define
  the workflow trigger event name as a standard CI/CD attribute.
- `gen_ai.request.messages` and `gen_ai.response.text` may contain prompt or
  model text. Use IDs, models, tokens, and status fields for triage unless the
  incident specifically requires content inspection.
- `gen_ai.cost.total_tokens` stores SDK-reported USD cost despite the inherited
  attribute name.
- `traceId` in JSONL is the same production pivot as Sentry `trace_id`.

## References

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [OpenTelemetry GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/)
- [OpenTelemetry VCS attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/vcs/)
- [OpenTelemetry code attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/code/)
- [OpenTelemetry CI/CD attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/cicd/)
- [Sentry AI Agents module](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/)
- [Sentry JavaScript Node SDK logs](https://docs.sentry.io/platforms/javascript/guides/node/logs/)
