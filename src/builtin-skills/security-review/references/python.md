# Python Security Notes

Use this when reviewing Python, Django, Flask, FastAPI, Celery, or Python service code. These examples refine the core skill; they do not add new reporting scope.

## Server-Side Entry Points

- Django views, DRF viewsets, Flask/FastAPI routes, GraphQL resolvers, webhook handlers, Celery tasks, management commands, and service-layer functions can cross trust boundaries.
- For background jobs and tasks, verify the caller, queue, payload signing, tenant context, and idempotency before assuming input is trusted.
- Decorators can prove authentication only if they wrap the effective handler. Still verify object-level authorization.
- DRF/FastAPI auth dependencies prove identity, not ownership of route params or body IDs.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| SQL injection | `cursor.execute(f"...{request.GET['q']}...")`, string-built raw SQL | Parameterized queries, ORM filters, strict enum allowlists for identifiers |
| Command injection | `os.system`, `subprocess.run(..., shell=True)`, shell strings with request data | `subprocess.run([fixed_binary, fixed_arg])`, strict allowlists, no shell |
| Path traversal | `open(base / request.args["name"])`, `send_file(user_path)`, unsafe archive extraction | `Path.resolve()` containment checks, generated filenames, safe storage APIs |
| SSRF | `requests.get(request.GET["url"])`, preview/proxy fetchers, redirect-following after first-hop validation | Exact host allowlist, block private/link-local IPs, disable or revalidate redirects |
| Open redirect | `redirect(request.GET["next"])`, login/callback redirects with weak host checks | Relative-path allowlist or framework helper with exact allowed hosts |
| Unsafe deserialization | `pickle.loads`, `yaml.load` without `SafeLoader`, model/job loaders on uploaded data | JSON or typed schemas, `yaml.safe_load`, signed trusted artifacts only |
| XSS | Jinja/Django `|safe`, `Markup`, disabled autoescape, raw HTML from user content | Autoescaping, vetted sanitizer, context-correct escaping |
| Authz bypass | `Model.objects.get(id=request.GET["id"])` on tenant data | Scope by authenticated user/org/account and enforce permissions before returning or mutating |
| Task trust confusion | Celery task mutates `invoice_id`, `user_id`, or `account_id` queued from a request without rechecking scope | Pass server-derived actor/tenant context and re-check before mutation |
| Secrets exposure | Logging tokens, cookies, auth headers, signed URLs, stack traces, or env secrets | Redacted logging, generic errors, server-only secret access |

## False-Positive Controls

- Django and SQLAlchemy ORM filters usually parameterize values. Raw SQL and string-built identifiers need closer review.
- Django and Jinja autoescape ordinary template interpolation by default. Report only unsafe filters, raw HTML, or disabled autoescape.
- `secrets` and `os.urandom` are suitable for security randomness; `random` is not.
- `yaml.safe_load` is the safe default for untrusted YAML; `yaml.load` may still be safe only when an explicit safe loader is used.
- `Path.resolve()` containment checks can mitigate traversal when they compare the resolved child against the resolved allowed root.

## Minimal Examples

**Report: object-level authorization bypass**

```python
invoice = Invoice.objects.get(id=request.GET["invoice_id"])
return JsonResponse({"total": invoice.total, "email": invoice.customer.email})
```

Require: authenticated account/org scope and permission before returning sensitive data.

**Report: task loses tenant context**

```python
@shared_task
def approve_invoice(invoice_id: str):
    Invoice.objects.filter(id=invoice_id).update(status="approved")
```

Require: reload trusted actor/tenant context and enforce permission.

**Report: unsafe uploaded state**

```python
state = pickle.loads(base64.b64decode(request.POST["state"]))
```

Risk: unsafe deserialization. Require: trusted, signature-verified artifact before deserialization.

**Do not report: scoped ORM query**

```python
invoice = Invoice.objects.get(id=invoice_id, account_id=request.user.account_id)
```

This is not an authorization bypass if `request.user.account_id` is trusted and the caller is authenticated for that account.
