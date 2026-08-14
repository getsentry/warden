---
name: warden-service
description: Queries and summarizes the Warden Service read API. Use when asked to inspect, search, summarize, or export Warden runs, findings, costs, outcomes, repositories, skills, or memories through Warden Service.
spec_hash: c2fea93e547a
---

# Warden Service

Query Warden Service with a read-only personal token and return a bounded, evidence-based answer.

## Workflow

1. Identify the Warden Service origin and confirm `WARDEN_PAT` is set without displaying its value.
2. If the token is missing, direct the user to **API access** in the Warden Service dashboard. Have them create a personal token and export it as `WARDEN_PAT`; never ask them to paste it into chat or a command literal.
3. Read `references/read-api.md` to select the exact route, supported filters, pagination behavior, and response fields for the question.
4. Narrow the request to the user's repository, time range, skill, severity, or other stated scope. Use a bounded `limit` for runs and findings.
5. Send a `GET` request with the token read from the environment. URL-encode every query value.
6. Follow `nextCursor` only while more results are needed. Preserve all original filters and stop when the requested scope is satisfied or the response omits `nextCursor`.
7. Summarize the relevant JSON fields. State the route and filters used, and distinguish an empty result from a failed request.

## Request Pattern

Use `--get` with `--data-urlencode` instead of assembling a query string manually:

```bash
curl --fail-with-body --silent --show-error --get \
  -H 'Accept: application/json' \
  -H "Authorization: Bearer ${WARDEN_PAT}" \
  --data-urlencode 'severity=high' \
  --data-urlencode 'skill=security-review' \
  --data-urlencode 'limit=30' \
  "${WARDEN_SERVICE_URL%/}/api/v1/findings"
```

Keep the token in `WARDEN_PAT`. Do not enable verbose or trace output that could expose the authorization header.

## Pagination

Only `/api/v1/runs` and `/api/v1/findings` use cursor pagination. Treat `nextCursor` as opaque and pass it back unchanged through URL encoding:

```bash
curl --fail-with-body --silent --show-error --get \
  -H 'Accept: application/json' \
  -H "Authorization: Bearer ${WARDEN_PAT}" \
  --data-urlencode "cursor=${NEXT_CURSOR}" \
  --data-urlencode 'severity=high' \
  --data-urlencode 'limit=100' \
  "${WARDEN_SERVICE_URL%/}/api/v1/findings"
```

## Errors

Use the HTTP status and the JSON `error.code` and `error.message` together:

| Status | Meaning | Action |
| --- | --- | --- |
| 400 | Invalid query filters | Correct the parameter names, values, or RFC 3339 timestamps. |
| 401 | Missing, invalid, or expired authentication | Verify the origin and replace the personal token through API access. |
| 403 | Insufficient role or disallowed personal-token operation | Keep the request read-only and within the token's repository scope. |
| 404 | Unknown or unauthorized route/resource | Verify the documented route or ID without assuming the resource exists. |
| 429 | Rate limited | Wait and retry later; do not create a tight retry loop. |

## Boundaries

- Use personal tokens only for `GET` or `HEAD`. Never attempt `POST`, `PUT`, `PATCH`, or `DELETE` with them.
- Never reveal, log, persist, embed as a command literal, or ask the user to paste a token.
- Respect the token's tenant, role, and repository restrictions. Never attempt to bypass them.
- Use only routes, filters, and response fields documented in `references/read-api.md`.
- Fetch and display only the data required for the user's stated scope. Use the export route only when the user explicitly requests an export.
- If the read API cannot answer the question, say so. Do not substitute an ingest, memory-recall, token-management, retention, or deletion request.
