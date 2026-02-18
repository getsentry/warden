# Model-Specific Guidance

Optimizations for Claude 4.x models (Sonnet 4.5, Opus 4.5).

## Claude 4.x Strengths

| Capability | Implication |
|------------|-------------|
| Precise instruction following | Can use simpler, more natural prompts |
| Structured output (JSON) | Reliable parsing without complex extraction |
| Parallel tool calling | Can investigate multiple files simultaneously |
| Long-horizon state tracking | Maintains context across extended sessions |

## Prompting Adjustments

### Simpler Language

Claude 4.x doesn't need aggressive emphasis:

**Before (older models):**
```markdown
CRITICAL: You MUST use this tool when...
```

**After (Claude 4.x):**
```markdown
Use this tool when...
```

### More Direct Communication

From [Anthropic's guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

> Claude 4.5 models have a more concise and natural communication style.
> More direct and grounded, provides fact-based progress rather than
> self-celebratory updates.

### Explicit Thoroughness

Claude 4.x may be conservative. If you want thorough analysis:

```markdown
Go beyond the basics to create a fully-featured analysis. Include
as many relevant findings as possible.
```

## Thinking and Reflection

Claude 4.x supports thinking between tool calls:

```markdown
After receiving tool results, carefully reflect on their quality and
determine optimal next steps before proceeding.
```

### Interleaved Thinking

For complex multi-step analysis:

```markdown
Use your thinking to plan and iterate based on new information,
then take the best next action.
```

### Thinking Sensitivity

From [Anthropic's guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

> When extended thinking is disabled, Claude Opus 4.5 is particularly
> sensitive to the word "think" and its variants.

If not using extended thinking, prefer alternatives:
- "consider" instead of "think about"
- "evaluate" instead of "think through"
- "reflect on" instead of "think over"

## Tool Usage

Claude 4.x excels at parallel tool execution:

```markdown
If you intend to call multiple tools and there are no dependencies,
make all independent calls in parallel.
```

### Proactive vs Conservative

To make Claude more proactive:

```markdown
By default, implement changes rather than only suggesting them.
Infer the most useful action and proceed.
```

To make Claude more conservative:

```markdown
Do not take action unless clearly instructed. Default to providing
information and recommendations rather than making changes.
```

## Code Exploration

From [Anthropic's guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices):

> Claude Opus 4.5 can be overly conservative when exploring code.

If needed, add explicit instructions:

```markdown
ALWAYS read and understand relevant files before reporting issues.
Do not speculate about code you have not inspected.
```

## Sources

- [Anthropic: Claude 4.x Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Anthropic: What's New in Claude 4.5](https://docs.claude.com/en/about-claude/models/whats-new-claude-4-5)
