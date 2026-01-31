# Output Formats

How to specify structured output for reliable parsing.

## Enforce JSON-Only Output

Be explicit about format requirements:

```markdown
IMPORTANT: Your response must be ONLY a valid JSON object.
No markdown, no explanation, no code fences.

Example response format:
{"findings": [{"id": "example-1", "severity": "medium", ...}]}
```

## Provide Complete Schema

Include all available fields so Claude knows the full structure:

```json
{
  "findings": [
    {
      "id": "unique-identifier",
      "severity": "critical|high|medium|low|info",
      "confidence": "high|medium|low",
      "title": "Short descriptive title",
      "description": "Detailed explanation",
      "location": {
        "path": "path/to/file.ts",
        "startLine": 10,
        "endLine": 15
      },
      "suggestedFix": {
        "description": "How to fix",
        "diff": "unified diff format"
      }
    }
  ]
}
```

## Field Requirements

Document which fields are required vs optional:

```markdown
Requirements:
- Return ONLY valid JSON starting with {"findings":
- "findings" array can be empty if no issues found
- "location.path" is auto-filled - just provide startLine (and optionally endLine). Omit location for general findings.
- "confidence" reflects certainty given codebase context
- "suggestedFix" is optional - only include when the fix is complete and correct
```

## Set Length Expectations

Prevent verbose output:

```markdown
Keep descriptions SHORT (1-2 sentences max)
Be concise - focus only on the changes shown
```

## Empty Results

Explicitly allow empty arrays:

```markdown
Return an empty findings array if no issues match the skill's criteria:
{"findings": []}
```

## Warden's JSON Extraction

The runner handles common output issues (`src/sdk/runner.ts`):

- Strips markdown code fences if present
- Finds `{"findings"` pattern in prose
- Extracts balanced JSON with nested objects
- Validates against FindingSchema with Zod

This provides resilience, but clean JSON output is still preferred.

## Severity Level Definitions

Severity reflects **urgency and required action**, not the type of issue. Each skill defines what "significant impact" means in its domain.

| Level    | Definition                                               |
|----------|----------------------------------------------------------|
| critical | Must fix before merge: significant impact if ignored     |
| high     | Should fix before merge: notable issue affecting quality |
| medium   | Worth reviewing: potential issue, may need action        |
| low      | Minor: address when convenient                           |
| info     | Informational: no action required                        |

Avoid vague definitions like "important" or "less important."
