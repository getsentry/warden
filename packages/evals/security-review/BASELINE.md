# Security Review Pi Baseline

Captured before Pi-specific prompt tuning.

Command:

```bash
pnpm evals -t security-review
```

Runtime: `pi`
Model: `anthropic/claude-sonnet-4-6`

Result:

- 7 passed
- 3 failed
- Duration: about 596s

Failing scenarios:

- `sentry-group-search-view-visit-visibility`
  - Pi reported 0 findings.
  - Missed private search-view visit visibility/object permission issue.
- `sentry-preprod-size-analysis-base-artifact-access`
  - Pi reported 0 findings.
  - Missed `baseArtifactId` project-access bypass.
- `sentry-workflow-open-periods-project-access`
  - Pi reported 0 findings.
  - Missed detector/group open-period project permission issue.

Passing scenarios:

- `sentry-autofix-settings-get-project-access`
- `sentry-preprod-snapshot-project-access`
- `sentry-release-threshold-empty-project-filter`
- `sentry-replay-count-project-scope-overwrite`
- `sentry-replay-delete-read-scope`
- `sentry-slack-options-load-unscoped-group`
- `sentry-workflow-connect-workflows-authz`
