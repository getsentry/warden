# GitHub Pull Request Review

How Warden interacts with GitHub pull requests via the Checks API and PR reviews.

## Configuration

Two thresholds control PR behavior:

| Option | Purpose | Default |
|--------|---------|---------|
| `commentOn` | Which findings appear as inline PR comments | all severities |
| `failOn` | When to block the PR (REQUEST_CHANGES) and fail the check | off |

## Review Event Types

GitHub PR reviews have three event types:
- `COMMENT` - Posts comments without blocking
- `REQUEST_CHANGES` - Posts comments and blocks merge
- `APPROVE` - Approves the PR (not used by Warden)

## Expected Behavior

### Review Event Selection

The review event type is determined solely by `failOn`:

| failOn | Findings | Review Event |
|--------|----------|--------------|
| not set | any | COMMENT |
| `off` | any | COMMENT |
| `critical` | critical | REQUEST_CHANGES |
| `critical` | high or lower | COMMENT |
| `high` | critical or high | REQUEST_CHANGES |
| `high` | medium or lower | COMMENT |
| `medium` | critical, high, or medium | REQUEST_CHANGES |
| `medium` | low or info | COMMENT |

### Comment Filtering

The `commentOn` threshold controls which findings appear as comments, independent of `failOn`:

| commentOn | Findings Shown |
|-----------|----------------|
| not set | all findings |
| `off` | none (no comments posted) |
| `critical` | only critical |
| `high` | critical and high |
| `medium` | critical, high, and medium |
| `low` | critical, high, medium, and low |
| `info` | all findings |

### Independence of Thresholds

`commentOn` and `failOn` operate independently:

- A finding can be commented (`commentOn`) but not block the PR (`failOn`)
- A finding can block the PR but be filtered from comments (if `commentOn` is more restrictive)
- Setting `failOn: off` never blocks, regardless of severity
- Setting `commentOn: off` posts no comments, but `failOn` can still block

### Inline Comment Format

Each inline comment includes:
1. Severity emoji and title (bold)
2. Confidence level (if provided)
3. Description
4. Suggested fix (if available, as GitHub suggestion block)
5. Attribution footnote (`warden: <skill-name>`)
6. Hidden deduplication marker

### Multi-line Findings

Findings spanning multiple lines use GitHub's multi-line comment feature:
- `start_line` set to the first line
- `line` set to the last line
- Both `side` and `start_side` set to `RIGHT`

Single-line findings omit `start_line` and `start_side`.

### GitHub Check Status

The GitHub Check conclusion follows the same logic as the review event:

| failOn | Findings Meet Threshold | Check Conclusion |
|--------|------------------------|------------------|
| not set | - | success (or neutral if findings exist) |
| `off` | - | success (or neutral if findings exist) |
| any severity | yes | failure |
| any severity | no | success (or neutral if findings exist) |

## Examples

### Block on Critical Only

```toml
[triggers.security]
output.failOn = "critical"
output.commentOn = "high"
```

- Critical findings: REQUEST_CHANGES, commented
- High findings: COMMENT, commented
- Medium/low/info: COMMENT, not commented

### Comment Everything, Never Block

```toml
[triggers.style]
output.failOn = "off"
# commentOn defaults to all
```

- All findings: COMMENT, commented
- PR never blocked regardless of severity

### Silent Monitoring

```toml
[triggers.experimental]
output.failOn = "off"
output.commentOn = "off"
```

- No comments posted
- PR never blocked
- Findings only visible in Check run details
