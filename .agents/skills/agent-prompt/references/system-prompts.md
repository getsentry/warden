# System Prompts

How Warden constructs system prompts and how to customize them.

## Warden's Prompt Architecture

Warden builds a two-layer prompt for each analysis:

### System Prompt (Built by Runner)

Constructed in `src/sdk/runner.ts`:

```xml
<role>
You are a code analysis agent for Warden...
</role>

<tools>
Available tools: Read, Grep
</tools>

<skill_instructions>
{skill.prompt injected here}
</skill_instructions>

<output_format>
JSON schema and requirements
</output_format>

<skill_resources>
Path to skill assets (if applicable)
</skill_resources>
```

### User Prompt (Per-Hunk)

Each code change is analyzed with:
- Skill name being applied
- Formatted code context (before/after lines)
- The diff hunk
- Instruction to only report matching findings

## XML Tags for Structure

Use XML tags to create clear sections:

```xml
<role>...</role>
<tools>...</tools>
<skill_instructions>...</skill_instructions>
```

**Benefits:**
- Clear boundaries between sections
- Model can reference sections by name
- Consistent parsing and validation

## Role Definition

The role section establishes:

| Element | Purpose |
|---------|---------|
| Identity | What kind of expert is this agent? |
| Scope | What does it evaluate? What's out of scope? |
| Stance | Conservative (avoid false positives) or thorough? |

**Example:**
```xml
<role>
You are a code analysis agent for Warden. You evaluate code changes
against specific skill criteria and report findings ONLY when the code
violates or conflicts with those criteria.
</role>
```

## Tool Documentation

Document available tools clearly:

```xml
<tools>
You have access to these tools to gather context:
- **Read**: Check related files to understand context
- **Grep**: Search for patterns to trace data flow
</tools>
```

## Claude Agent SDK Options

From [Anthropic's SDK documentation](https://platform.claude.com/docs/en/agent-sdk/modifying-system-prompts):

| Option | Effect |
|--------|--------|
| `systemPrompt: string` | Replace default entirely |
| `systemPrompt: { preset: "claude_code" }` | Use full Claude Code prompt |
| `systemPrompt: { preset: "claude_code", append: "..." }` | Add to Claude Code prompt |

**Note:** The SDK's minimal default omits coding guidelines. Use `preset: "claude_code"` for full capabilities.

## CLAUDE.md Integration

Project-level context via CLAUDE.md requires explicit configuration:

```typescript
options: {
  systemPrompt: { preset: "claude_code" },
  settingSources: ["project"], // Required to load CLAUDE.md
}
```

## Sources

- [Anthropic: Modifying System Prompts](https://platform.claude.com/docs/en/agent-sdk/modifying-system-prompts)
- `src/sdk/runner.ts` - Warden's implementation
