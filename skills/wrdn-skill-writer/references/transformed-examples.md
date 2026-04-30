# Transformed Examples

Open this file when you need concrete examples of good full-skill authoring.

## Contents

- Happy Path
- Secure Or Robust Variant
- Anti-Pattern And Correction

## Happy Path

Good focused skill frontmatter:

```md
---
name: authz-review
description: Review changed code for missing or incorrect authorization checks. Use when asked to add or update an authorization review skill for Warden.
---
```

Good runtime shape:

- `SKILL.md` routes the agent through one concern area
- `SPEC.md` defines maintenance scope and evidence rules
- `SOURCES.md` records provenance and gaps
- `references/` files answer concrete lookup questions such as schema details or exploit patterns

Why it works:

- one concern boundary
- clear trigger language
- complete maintenance artifacts

## Secure Or Robust Variant

Better full skill shape for a non-trivial concern:

- `SKILL.md`
  - short router
  - explicit output rules
  - references keyed by lookup need
- `SPEC.md`
  - names false-positive controls
  - names out-of-scope requests
  - lists useful improvement evidence
- `SOURCES.md`
  - links implementation files and bundled docs
  - tracks open gaps honestly

Use this variant when:

- the skill covers a subtle review domain
- the concern needs multiple focused references
- the trigger wording needs explicit should-trigger and should-not-trigger boundaries

## Anti-Pattern And Correction

Bad skill:

```md
---
name: review
description: Review code.
---

Check the code for problems.
```

Why it fails:

- trigger language is generic
- no concern boundary
- no maintenance artifacts
- no usable guidance for findings

Corrected version:

```md
---
name: tenant-isolation-review
description: Review changed code for tenant-isolation breaks, cross-org data mixing, or missing scoping checks. Use when asked to create or update a Warden skill for multi-tenant boundary review.
---
```

Corrected artifact set:

- `SKILL.md` routes only tenant-isolation review
- `SPEC.md` documents scope, evidence model, and limits
- `SOURCES.md` tracks implementation references and open gaps
- `references/` files document exact boundary patterns and false-positive controls
