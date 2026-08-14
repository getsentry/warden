# Warden Service Read API

Use this reference to map a question to an exact route, validate filters, and interpret the response. All `/api/v1` routes require `Authorization: Bearer $WARDEN_PAT`.

## Route Map

| Question | Route | Result |
| --- | --- | --- |
| Recent or filtered runs | `GET /api/v1/runs` | `items[]` run summaries and optional `nextCursor` |
| One run and its skill executions | `GET /api/v1/runs/:id` | `run` summary and `skills[]` execution details |
| Findings search or feed | `GET /api/v1/findings` | `items[]` findings and optional `nextCursor` |
| Repository activity | `GET /api/v1/repositories` | `items[]` repository summaries |
| Skill activity | `GET /api/v1/skills` | `items[]` skill summaries |
| Usage and cost aggregation | `GET /api/v1/costs` | `groups[]` and `totals` |
| Run outcome totals | `GET /api/v1/outcomes/summary` | `totals` |
| Memories by lifecycle | `GET /api/v1/memories` | `items[]` memories |
| One memory and its evidence | `GET /api/v1/memories/:id` | `memory`, `evidence[]`, and `lifecycle[]` |
| Retained tenant or repository data | `GET /api/v1/export` | Versioned `records[]` export |

## Run Filters

`GET /api/v1/runs` accepts the common filters plus `cursor` and `limit`.

| Filter | Accepted value |
| --- | --- |
| `from`, `to` | RFC 3339 timestamp |
| `repositoryId` | Repository UUID returned by `/api/v1/repositories` |
| `skill` | Exact skill name |
| `model` | Exact model name |
| `runtime` | Exact runtime name |
| `provider` | Exact provider name |
| `lane` | Exact usage lane |
| `source` | `cli`, `action`, `sdk`, or `replay` |
| `outcome` | `success`, `failure`, `cancelled`, or `skipped` |
| `errorCode` | Exact stable skill error code |
| `cursor` | Opaque `nextCursor` from the previous page |
| `limit` | Integer from 1 to 100; defaults to 50 |

A run summary includes IDs, source, data profile, repository identity, timestamps, outcome, duration, finding counts, cost, and an optional trace ID. A run detail also includes each skill's status, model, runtime, duration, finding counts, and usage.

## Finding Filters

`GET /api/v1/findings` accepts:

| Filter | Accepted value |
| --- | --- |
| `from`, `to` | RFC 3339 timestamp |
| `repositoryId` | Repository UUID returned by `/api/v1/repositories` |
| `skill` | Exact skill name |
| `severity` | `high`, `medium`, or `low` |
| `outcome` | `posted`, `deduped`, `skipped`, `resolved`, `failed`, `rejected`, or `revised` |
| `query` | Case-insensitive text searched in title, description, and path; 1 to 256 characters |
| `cursor` | Opaque `nextCursor` from the previous page |
| `limit` | Integer from 1 to 100; defaults to 50 |

A finding includes its IDs, repository, skill, severity, optional confidence, title, description, optional location, latest outcome, observation time, and run completion time.

## Cost and Outcome Filters

`GET /api/v1/costs` and `GET /api/v1/outcomes/summary` accept the common run filters listed above, excluding `cursor` and `limit`.

Costs also accept `groupBy`, a comma-separated list of one to four dimensions:

- `day`
- `repository`
- `skill`
- `model`
- `runtime`
- `provider`
- `lane`
- `source`
- `outcome`

`groupBy` defaults to `day`. Cost groups include their dimensions, run count, input and output tokens, and nullable USD cost. The response also includes totals.

## Repository, Skill, Memory, and Export Routes

- `/api/v1/repositories` and `/api/v1/skills` accept no filters.
- `/api/v1/memories` accepts optional `lifecycle`: `candidate`, `active`, `superseded`, `archived`, or `expired`.
- `/api/v1/memories/:id` requires a memory UUID.
- `/api/v1/export` accepts optional `repositoryId`. The response can be large, so use it only for an explicit export request.

Repository restrictions on the personal token apply to every result. A 404 for an ID can mean the resource does not exist or is outside the token's authorized scope.

## Pagination Rules

1. Start with the narrowest filters and a `limit` no larger than the number of results needed, up to 100.
2. Read `items` and inspect `nextCursor`.
3. If more results are required, repeat the same request with `cursor=<nextCursor>`.
4. Stop after satisfying the request or when `nextCursor` is absent.

Never decode, modify, or infer meaning from a cursor.
