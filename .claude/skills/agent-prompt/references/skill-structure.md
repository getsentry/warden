# Skill Structure

How to write effective Warden skill files.

## File Format

Skills use YAML frontmatter + markdown body:

```markdown
---
name: skill-name
description: Brief description for discovery and trigger matching.
allowed-tools: Read Grep Glob
---

[Prompt body - the actual instructions]
```

## Required Frontmatter

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier, lowercase with hyphens |
| `description` | One line explaining when to use this skill |
| `allowed-tools` | Space-separated list (typically `Read Grep Glob`) |

## Recommended Body Structure

```markdown
[Role statement - who the agent is]

## Your Task

[Clear statement of what to analyze]

### [Category 1]

- Specific pattern to look for
- Guiding questions: "Is X happening? Does Y exist?"

### [Category 2]

...

## What NOT to Report

[Explicit exclusions prevent scope creep]

## Severity Levels

[Definitions tied to impact]

## Output Requirements

[Formatting expectations]
```

## Effective Patterns

### Guiding Questions

Help the agent know what to look for:

```markdown
### Injection Vulnerabilities
- **SQL injection**: User input concatenated into queries instead of parameterized?
- **Command injection**: User input passed to shell/exec functions?
```

### Explicit Exclusions

Prevent false positives and scope creep:

```markdown
## What NOT to Report

- Security vulnerabilities (use security-review skill)
- Style or formatting issues
- Code that "could be better" but works correctly
```

### Confidence Calibration

Set expectations for certainty:

```markdown
Do NOT use low or info severity - if you're not confident it's a real
bug, don't report it.
```

### Severity Tied to Impact

Avoid vague definitions:

```markdown
- **critical**: Crash, data loss, or silent data corruption
- **high**: Incorrect behavior in common scenarios
- **medium**: Incorrect behavior in edge cases
```

## File Locations

Skills are discovered in order (first match wins):

1. `.warden/skills/{name}/SKILL.md` - Project-specific
2. `.agents/skills/{name}/SKILL.md` - Shared agent skills
3. `.claude/skills/{name}/SKILL.md` - Claude Code skills
4. `skills/{name}/SKILL.md` - Built-in skills

## Examples

See existing skills for reference:
- `skills/security-review/SKILL.md` - Comprehensive checklist approach
- `skills/find-bugs/SKILL.md` - Confidence-focused with exclusions
- `skills/code-simplifier/SKILL.md` - Balanced "do/don't" guidance
