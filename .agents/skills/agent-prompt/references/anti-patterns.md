# Anti-Patterns

Common mistakes to avoid when writing prompts.

## Over-Emphasis and Anchoring

From [Anthropic's Opus 4.5 guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

> Claude Opus 4.5 is more responsive to the system prompt than previous
> models. Where you might have said "CRITICAL: You MUST...", you can
> use more normal prompting.

From [Vercel's AGENTS.md research](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals):

> Instructions stating "You MUST invoke the skill" caused agents to anchor
> excessively on documentation patterns while missing project context.

**Avoid:**
```markdown
CRITICAL: You MUST ALWAYS check for SQL injection. NEVER skip this.
IT IS ABSOLUTELY ESSENTIAL that you...
```

**Prefer:**
```markdown
Understand the code's intent first, then check for SQL injection:
Is user input concatenated into queries instead of parameterized?
```

The key insight: "MUST" language causes anchoring on the instruction at the expense of contextual understanding.

## Scope Creep

Each skill should do one thing well.

**Avoid:**
```markdown
Find security issues, performance problems, and bugs too.
```

**Prefer:** Create separate skills for each concern.

## Vague Severity

**Avoid:**
```markdown
Use high severity for important issues and medium for less important ones.
```

**Prefer:**
```markdown
- **critical**: Crash, data loss, or silent data corruption
- **high**: Incorrect behavior in common scenarios
- **medium**: Incorrect behavior in edge cases
```

## Negative-Only Instructions

**Avoid:**
```markdown
Do not output markdown.
Do not include explanations.
Do not wrap in code fences.
```

**Prefer:**
```markdown
Return ONLY valid JSON starting with {"findings":
```

## Missing Exclusions

Without explicit exclusions, skills report everything tangentially related.

**Avoid:** Omitting "What NOT to Report" section.

**Prefer:**
```markdown
## What NOT to Report

- Security vulnerabilities (use security-review skill)
- Style or formatting issues
- Performance concerns (unless causing incorrect behavior)
```

## Hallucination-Prone Patterns

From [Anthropic's guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

> Never speculate about code you have not opened.

**Avoid:** Asking for analysis without providing code context.

**Prefer:** Always include actual code in the prompt (Warden does this automatically).

## Over-Engineering Output

From [Anthropic's guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

> Claude Opus 4.5 has a tendency to overengineer by creating extra files
> or adding unnecessary abstractions.

For prompts, keep output requirements minimal:

**Avoid:**
```markdown
Include a detailed analysis section, then a summary, then recommendations,
then a risk assessment matrix, then...
```

**Prefer:**
```markdown
Return JSON with findings array. Keep descriptions to 1-2 sentences.
```

## Conflicting Instructions

**Avoid:**
```markdown
Be thorough and check everything.
...
Only report high-confidence issues.
```

**Prefer:** Consistent stance throughout the prompt.

## Missing Examples

For complex output formats, include an example:

**Avoid:** Schema only without example.

**Prefer:**
```markdown
Example response format:
{"findings": [{"id": "sql-injection-1", "severity": "high", ...}]}

Full schema:
...
```
