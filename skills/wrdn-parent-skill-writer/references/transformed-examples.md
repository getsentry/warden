# Transformed Examples

Open this file when you need concrete examples of good parent-skill authoring.

## Contents

- Happy Path
- Secure Or Robust Variant
- Anti-Pattern And Correction

## Happy Path

Good parent skill description:

```md
---
name: security-review
description: Review changed code for security vulnerabilities across authorization, tenant boundaries, injection, data exposure, and secret handling. Use when asked for a broad Warden security review skill that will guide deeper focused checks.
---
```

Good parent-skill shape:

- `SKILL.md` stays broad but names concern areas explicitly
- `SPEC.md` documents required coverage dimensions
- `SOURCES.md` records why those dimensions exist
- bundled references define examples and maintenance rules

Why it works:

- broad domain, explicit concern map
- enough structure for downstream decomposition
- no attempt to be a generic catch-all review

## Secure Or Robust Variant

Better parent-skill structure:

- top-level skill names:
  - authorization and access control
  - tenant isolation
  - injection
  - data exfiltration
  - secret handling
- `SPEC.md` explains why each dimension matters and what evidence should be required
- exclusions call out style issues, generic correctness, and unrelated refactors

Use this variant when:

- the parent skill will eventually drive coordinator decomposition
- the domain spans multiple security or reliability concern boundaries
- false positives are likely without explicit exclusions

## Anti-Pattern And Correction

Bad parent skill:

```md
---
name: security-review
description: Review code for security issues.
---
```

Why it fails:

- the domain is broad but unstructured
- there is no concern map
- downstream focused skills have no direction

Corrected version:

```md
---
name: security-review
description: Review changed code for security vulnerabilities across authorization, tenant boundaries, injection, data exposure, and secret handling. Use when asked for a broad Warden security review skill that should guide deeper focused checks.
---
```

Corrected maintenance shape:

- `SPEC.md` lists required coverage dimensions and exclusions
- `SOURCES.md` ties the concern map back to evidence and implementation
- references show how to keep the parent skill broad without becoming vague
