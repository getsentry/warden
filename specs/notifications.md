# Notification System for Scheduled Triggers

## Problem

Warden's scheduled triggers analyze the full codebase on a cron. Today, findings go to a single tracking issue per skill that gets overwritten each run. There's no way to:
- Get notified in Slack when new findings appear
- Mark findings as false positives so they don't recur
- Track individual findings across runs

## Goals

1. Per-finding GitHub issues with semantic dedup across runs
2. Slack webhook notifications for new findings
3. Suppression file for false positives (rule-based pre-filtering)
4. Replace the single-tracking-issue approach with a provider-based notification layer

## Configuration

### `warden.toml`

```toml
[[notifications]]
type = "github-issues"
labels = ["warden"]

[[notifications]]
type = "slack"
webhookUrl = "$SLACK_WEBHOOK_URL"
```

Top-level `[[notifications]]` array. Each provider receives all non-suppressed findings independently. Environment variables expanded at runtime via `$VAR` syntax.

### Migration

The `[[notifications]]` section replaces the existing `schedule.issueTitle` tracking-issue approach. The `createOrUpdateIssue` code path and `schedule.issueTitle` config are removed. `schedule.createFixPR` and `schedule.fixBranchPrefix` remain (fix PRs are orthogonal to notifications).

## Suppression File

Located at `.agents/warden/suppressions.yaml`:

```yaml
suppressions:
  - skill: "security-audit"
    paths: ["src/legacy/**"]
    reason: "Legacy code, not worth fixing"

  - skill: "security-audit"
    paths: ["src/admin/query.ts"]
    title: "SQL injection"
    reason: "Uses parameterized queries, false positive"
```

Rules match on:
- **skill** (required): Exact skill name
- **paths** (required): Glob patterns matched against finding location path
- **title** (optional): Substring match against finding title
- **reason** (required): Human-readable justification

Loaded once per workflow run, applied before any provider receives findings.

## Provider Interface

```typescript
interface NotificationProvider {
  readonly name: string;
  notify(context: NotificationContext): Promise<NotificationResult>;
}

interface NotificationContext {
  findings: Finding[];
  reports: SkillReport[];
  repository: { owner: string; name: string };
  commitSha: string;
}

interface NotificationResult {
  provider: string;
  sent: number;
  skipped: number;
  errors: string[];
}
```

## Provider Flow

```
Skill Report -> Apply Suppressions -> All Providers (each gets same findings)
                                       |-- github-issues (semantic dedup, creates/skips per finding)
                                       |-- slack (sends all findings it receives)
```

## GitHub Issues Provider

- Creates one issue per unique finding
- Dedup: two-tier
  1. Hash match via `<!-- warden:SHA256 -->` marker in issue body (cheap, catches identical text)
  2. Semantic match via Haiku for same-file findings with no hash match (handles LLM variation)
- Also checks closed issues with `warden:false-positive` label (treated as suppressed)
- Issue title: `[Warden] {finding.title}`
- Labels: configurable base labels + `warden:{skillName}`
- Body: severity, description, location with code link, suggested fix, hash marker
- Config: `labels` (string array, default `["warden"]`)

## Slack Provider

- Posts to incoming webhook URL using Block Kit formatting
- Sends all non-suppressed findings it receives
- Message: repo, commit, severity summary, up to 10 findings with details
- Skips notification if findings array is empty
- Config: `webhookUrl` (string, supports `$ENV_VAR` expansion)

## Schedule Workflow Integration

In `src/action/workflow/schedule.ts`, the `createOrUpdateIssue` call is replaced with:

```typescript
const dispatcher = new NotificationDispatcher(providers, suppressions);
const result = await dispatcher.dispatch({
  findings: report.findings,
  reports: [report],
  repository: { owner, name: repo },
  commitSha: headSha,
  skillName: resolved.name,
});
```

## Future Work

- Persistent storage for "previously seen" finding tracking across all providers
- `autoClose` config flag on GitHub Issues provider (close issues when findings disappear)
- CLI command for managing suppressions (`warden suppress add`)
- PR trigger integration (generic enough, but PR comments already have sophisticated dedup)
