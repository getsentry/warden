# Context Design

Research on how context delivery affects agent performance. Based on [Vercel's AGENTS.md evaluation](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals).

## Key Finding: Passive Context Wins

Vercel's evaluation showed dramatic performance differences:

| Approach | Pass Rate |
|----------|-----------|
| No docs | 53% |
| Skills (default) | 53% |
| Skills with explicit instructions | 79% |
| AGENTS.md (passive context) | 100% |

## Why Passive Context Outperforms

Three structural advantages:

### 1. Eliminated Decision Burden

Information exists automatically rather than requiring agent judgment about when retrieval is necessary.

**Implication for skills:** Warden injects skill prompts directly into the system prompt. This is passive context - the agent doesn't need to decide to load the skill.

### 2. Persistent Availability

Documentation remains accessible throughout every conversation turn via system prompt.

**Implication for skills:** Keep skill prompts self-contained. Don't require the agent to fetch additional context to understand the task.

### 3. Avoided Sequencing Problems

No competing instructions about whether to explore first vs consult docs first.

**Implication for skills:** Be explicit about the analysis approach. Don't leave ordering ambiguous.

## Instruction Wording Matters

Subtle wording differences produced dramatically divergent outcomes:

| Wording | Effect |
|---------|--------|
| "You MUST invoke the skill" | Agent anchored on docs, missed project context |
| "Explore project first, then invoke skill" | Agent built context first, better results |

### Recommendations

**Avoid:**
```markdown
You MUST check for SQL injection on every code change.
```

**Prefer:**
```markdown
Understand the code's intent first, then check for SQL injection:
Is user input concatenated into queries?
```

## Retrieval-Led Reasoning

From Vercel's research:

> "Prefer retrieval-led reasoning over pre-training-led reasoning"

This means: look at the actual code before applying general knowledge.

**For Warden skills:**
```markdown
## Analysis Approach

1. Read the code context provided
2. Use Read/Grep to investigate related files if needed
3. Apply skill criteria to what you've observed
4. Only report issues you've verified in the code
```

## Compression Works

Vercel reduced docs from 40KB to 8KB (80% reduction) with no loss in effectiveness.

**Implication for skills:**
- Concise prompts work as well as verbose ones
- Use structured formats (tables, lists) over prose
- Index references rather than including full content

**Example - compressed reference:**
```markdown
### Injection Types
SQL|Command|Template|Header|XSS|Path traversal
```

vs verbose:
```markdown
There are several types of injection vulnerabilities you should check for.
First, SQL injection occurs when... Second, command injection...
```

## When Skills Add Value

Skills remain valuable for:
- User-triggered workflows (version upgrades, migrations)
- Explicit "apply this standard" requests
- Tasks requiring specific tool sequences

For general knowledge that should always apply, passive context wins.

## Application to Warden

Warden's architecture aligns with these findings:

1. **Passive injection** - Skill prompts are injected into system prompt
2. **Hunk context provided** - Code is in the user prompt, not requiring retrieval
3. **Read-only tools available** - Agent can investigate but starts with context

To maximize effectiveness:
- Write self-contained skill prompts
- Include analysis approach (explore → apply criteria)
- Avoid "MUST" language that causes anchoring
- Keep prompts concise with structured references

## Sources

- [Vercel: AGENTS.md Outperforms Skills](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
