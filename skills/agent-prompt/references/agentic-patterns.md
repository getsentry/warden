# Agentic Patterns

Patterns for building effective tool-using agents.

## Tool Boundaries

Define clear tool access for safety:

```typescript
allowedTools: ['Read', 'Grep'],
disallowedTools: ['Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch'],
```

Document available tools in the system prompt so the agent knows its capabilities.

## Investigation Before Reporting

From [Anthropic's guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

> ALWAYS read and understand relevant files before proposing code edits.
> Do not speculate about code you have not inspected.

Encourage thorough analysis:

```markdown
## Analysis Approach

1. **Understand intent**: What is the code trying to do?
2. **Trace data flow**: Follow variables from input to usage
3. **Consider edge cases**: Empty, null, zero, negative values?
4. **Check error paths**: Are failures handled correctly?
5. **Verify assumptions**: What might not be true?
```

## Confidence Levels

Require explicit confidence:

```markdown
"confidence" reflects certainty this is a real issue:
- **high**: Clear violation, no ambiguity
- **medium**: Likely issue, context might justify it
- **low**: Possible concern, needs human review
```

## Handling Uncertainty

From [OpenAI's agent guidelines](https://cookbook.openai.com/examples/gpt4-1_prompting_guide):

> Different tools should have different uncertainty thresholds.

For analysis:

```markdown
Only report bugs you are confident are real. Do not speculate or
report "potential" issues. If you're unsure, don't report it.
```

## Persistence for Agentic Tasks

From [OpenAI's GPT-5 guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide):

> Keep going until the task is resolved before yielding back to the user.

For multi-step analysis, encourage completion:

```markdown
Continue investigating until you have checked all relevant code paths.
Use Read and Grep to trace data flow through the codebase.
```

## Subagent Isolation

From [agentic best practices](https://www.ranthebuilder.cloud/post/agentic-ai-prompting-best-practices-for-smarter-vibe-coding):

> Each subagent should run in complete isolation. Every call should be
> like a pure function - same input, same output, no shared state.

Warden achieves this by analyzing each hunk independently.

## Context Management

For long-running tasks, from [Anthropic's guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

```markdown
Your context window will be automatically compacted. Do not stop tasks
early due to token budget concerns. Save progress before context refreshes.
```

## Sources

- [Anthropic: Claude 4.x Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [OpenAI: GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)
- [Agentic AI Prompting Best Practices](https://www.ranthebuilder.cloud/post/agentic-ai-prompting-best-practices-for-smarter-vibe-coding)
