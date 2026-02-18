# Core Principles

Foundational rules for writing effective prompts. Derived from [Anthropic's official documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices).

## 1. Be Explicit

Claude 4.x models respond well to clear, explicit instructions.

**Less effective:**
```
Review this code for issues.
```

**More effective:**
```
Analyze the code changes for security issues. Only report genuine
security concerns, not style issues.
```

## 2. Provide Context and Motivation

Explain *why* a behavior matters.

**Less effective:**
```
Never report style issues.
```

**More effective:**
```
Do not report style issues. This skill focuses on security vulnerabilities.
Style issues are handled by code-simplifier and would create noise here.
```

## 3. Be Vigilant with Examples

Claude pays close attention to examples. Ensure they demonstrate desired behaviors only.

## 4. Prefer Positive Instructions

Tell Claude what to do, not what to avoid.

**Less effective:**
```
Do not use markdown in your response.
```

**More effective:**
```
Return ONLY valid JSON starting with {"findings":
```

## 5. Scope Narrowly

Broad prompts decrease accuracy. Each skill should have one clear focus.

**Less effective:**
```
Find bugs, security issues, performance problems, and style violations.
```

**More effective:**
```
Identify functional bugs that cause incorrect behavior. Focus on null
handling, off-by-one errors, and async issues.
```

## 6. Match Prompt Style to Output

The formatting in your prompt influences Claude's response style. Remove markdown from prompts if you want less markdown in output.

## Sources

- [Anthropic: Claude 4.x Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [OpenAI: Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
