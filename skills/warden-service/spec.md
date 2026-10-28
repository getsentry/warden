# Warden Service

## Intent

Teach coding agents to investigate Warden history, findings, costs, outcomes, repositories, skills, memories, and exports through the Warden Service read API. The skill makes agent access safe and repeatable by using a read-only personal token, documented filters, bounded pagination, and concise summaries instead of exposing credentials or dumping service data.

## Triggers

- **SHOULD** activate when a user asks an agent to query, inspect, search, summarize, or export data from Warden Service or its API.
- **SHOULD** activate for questions about Warden runs, findings, costs, outcomes, repositories, skills, or memories when the requested source is Warden Service.
- **SHOULD NOT** activate when the user asks to run the local Warden code-review CLI, configure Warden publication or memory, deploy Warden Service, or administer service data.
- **SHOULD NOT** activate for generic API work or code review without Warden Service context.

## Behaviors

### Behavior: Establish safe API access

The agent SHALL use the Warden Service origin and a read-only personal token stored in `WARDEN_PAT`, direct a user without a token to the dashboard's API access page, and reference the environment variable without requesting, printing, or embedding its value.

#### Scenario: Missing personal token

- **WHEN** the user asks the agent to query Warden Service but `WARDEN_PAT` is unavailable
- **THEN** the agent explains how to create a personal token from API access in the dashboard and asks the user to export it as `WARDEN_PAT` without pasting the token into chat or a command literal

### Behavior: Select documented read routes and filters

The agent SHALL map the user's question to the documented `GET` route and supported query parameters, using `/api/v1/findings`, `/api/v1/runs`, `/api/v1/runs/:id`, `/api/v1/repositories`, `/api/v1/skills`, `/api/v1/costs`, `/api/v1/outcomes/summary`, `/api/v1/memories`, `/api/v1/memories/:id`, or `/api/v1/export` as appropriate.

#### Scenario: Search high-severity security findings

- **WHEN** the user asks for the latest high-severity security findings from Warden Service
- **THEN** the agent chooses `GET /api/v1/findings` with `severity=high`, `skill=security-review`, and a bounded `limit`

#### Scenario: Group costs by repository and skill

- **WHEN** the user asks for Warden cost grouped by repository and skill over a date range
- **THEN** the agent chooses `GET /api/v1/costs` with `groupBy=repository,skill` and RFC 3339 `from` and `to` filters

### Behavior: Send a safe authenticated request

The agent SHALL send read requests with `Authorization: Bearer $WARDEN_PAT`, request JSON, fail visibly on HTTP errors, URL-encode query values, and keep the credential out of command text and output.

#### Scenario: Execute a filtered findings request

- **WHEN** the agent has a service origin, `WARDEN_PAT`, and a filtered findings query
- **THEN** it issues a `GET` request with bearer authentication from the environment and safely encoded query parameters without echoing the token

### Behavior: Follow bounded pagination

The agent SHALL follow `nextCursor` for `/api/v1/runs` and `/api/v1/findings` only until the requested result scope is satisfied or the response omits `nextCursor`, preserving the original filters on each request.

#### Scenario: Retrieve more than one findings page

- **WHEN** a findings response includes `nextCursor` and the user requested more results than the current page contains
- **THEN** the agent requests the next page with the returned cursor and the same filters, stopping once enough results are collected or no cursor remains

### Behavior: Summarize API evidence

The agent SHALL answer from the returned JSON, identify the route and filters that scoped the result, distinguish an empty result from a failed request, and present only the fields needed for the user's question.

#### Scenario: Summarize repository costs

- **WHEN** the costs API returns grouped data and totals
- **THEN** the agent reports the relevant groups and total cost with the requested date scope rather than reproducing the entire JSON response

### Behavior: Diagnose API errors

The agent SHALL use the structured `error.code` and `error.message` response plus the HTTP status to explain the failure and recommend a scoped correction, treating 401 as missing or invalid authentication, 403 as insufficient or disallowed personal-token access, 400 as invalid filters, 404 as an unknown or unauthorized resource, and 429 as a signal to retry later.

#### Scenario: Personal token attempts a write

- **WHEN** Warden Service returns HTTP 403 because a personal token was used for a non-read request
- **THEN** the agent explains that personal tokens are read-only and does not retry the mutation with another method

## Constraints

### Constraint: Protect credentials

The agent MUST NOT reveal, log, persist, embed as a command literal, or ask the user to paste a Warden personal token.

### Constraint: Preserve read-only access

The agent MUST NOT use a personal token for `POST`, `PUT`, `PATCH`, or `DELETE` requests or attempt to bypass its route and repository restrictions.

### Constraint: Use the documented contract

The agent MUST NOT invent API routes, query parameters, response fields, or client-side assumptions when the documented read API does not answer the user's question.

### Constraint: Bound data access

The agent MUST NOT fetch or display more Warden Service data than needed to satisfy the user's stated scope.

<!-- skillet-version: 1.7.0 -->
