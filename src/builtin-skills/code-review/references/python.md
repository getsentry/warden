# Python Bug Review Notes

Use this when reviewing Python, Django, Flask, FastAPI, Celery, or Python service code. These notes refine the core `code-review` skill; they do not add style, architecture, security, or performance-only scope.

## Runtime Boundaries

- Type hints are not runtime validation. Treat request data, query params, env vars, external API responses, database rows, task payloads, and deserialized files as shape-unknown until validated.
- Pydantic models, DRF serializers, dataclasses, typed dicts, Django model fields, migrations, and existing tests can prove the intended contract. Read them before reporting a mismatch.
- Decorators and framework hooks can change call order, transaction scope, auth context, and exception behavior. Verify the effective path.
- Background tasks and management commands often run outside request transactions and sessions. Check idempotency, tenant/account context, and retry behavior before reporting.

## High-Signal Patterns

| Pattern | Bug Shape | Safer Shape |
|---------|-----------|-------------|
| Mutable defaults | Function, dataclass, or model defaults reuse lists, dicts, sets, or objects across calls or instances. | Use `None` plus initialization, `default_factory`, or framework-specific callable defaults. |
| Falsey fallback | `value or default` treats `0`, `False`, or `""` as absent when those are valid values. | Check `is None`, missing keys, or explicit sentinel values. |
| Missing `None` handling | `.first()`, `.get()`, optional config, env values, cache reads, or external responses are dereferenced without proving presence. | Add explicit absence handling or enforce presence at the boundary. |
| Swallowed errors | Broad `except` returns success, empty data, or partial defaults that callers treat as complete. | Propagate failure, return explicit partial state, or compensate rolled-back work. |
| Transaction gaps | Multiple writes, task enqueues, cache updates, or file operations can partially succeed when a later step fails. | Use transactions, `on_commit`, idempotency keys, or compensation. |
| Async mismatch | Coroutine is not awaited, blocking I/O runs in an async endpoint, or async context managers are entered incorrectly. | Await coroutines, use async clients, and keep blocking work out of event-loop paths. |
| Iterator exhaustion | Generators, queryset iterators, request streams, or file objects are consumed once and then reused as if still populated. | Materialize intentionally or pass a fresh iterator/stream. |
| Timezone and precision | Naive and aware datetimes are mixed, date boundaries use server local time, or decimal money is converted to float. | Normalize timezone and use `Decimal` or integer minor units for money. |
| Query and migration drift | Renamed fields, changed defaults, non-null constraints, data migrations, or backfills miss existing rows or write wrong records. | Include backward-compatible migrations and scoped update filters. |
| Task retry side effects | Celery or queue retries duplicate emails, charges, state transitions, or external calls. | Make side effects idempotent or persist completion before retryable boundaries. |

## False-Positive Controls

- Django ORM, SQLAlchemy, and Pydantic can enforce contracts. Verify the exact model, serializer, or schema before reporting.
- `get_or_create`, `update_or_create`, database constraints, and transactions can mitigate duplicate or partial-write paths.
- A broad `except` is not a finding if the caller receives explicit failure state and no partial success is claimed.
- Mutable values are safe when created inside the function or supplied by a documented immutable factory.
- QuerySet laziness is not a bug by itself. Show the changed evaluation order that produces wrong data.
- Type-checker-only issues are findings only when they deterministically break runtime behavior, packaging, or CI.

## Minimal Examples

**Report: mutable default**

```python
def collect_errors(error, bucket=[]):
    bucket.append(error)
    return bucket
```

Every call shares the same list, so unrelated requests can see stale errors.

**Report: swallowed partial failure**

```python
try:
    charge_customer(invoice)
    mark_paid(invoice)
except Exception:
    return {"ok": True}
```

The caller receives success even if charging or persistence failed.

**Report: missing absence handling**

```python
profile = Profile.objects.filter(user_id=user_id).first()
return profile.timezone
```

If profiles are optional or not yet created, this crashes instead of following the expected fallback.

**Do not report: dataclass default factory**

```python
@dataclass
class Batch:
    items: list[str] = field(default_factory=list)
```

Each instance receives a fresh list.
