---
name: Skill Writer
description: Generate valid Warden skill definitions from natural language descriptions
---

## Usage

Describe what the skill should do, and this will generate a complete skill YAML file.

## Instructions

When the user describes a skill they want to create:

1. **Understand the Purpose**: Clarify what the skill should analyze or check
2. **Design the Prompt**: Write a clear, specific system prompt for the Claude agent
3. **Configure Tools**: Select appropriate tool restrictions based on the skill's needs
4. **Define Output Expectations**: Ensure the skill will produce valid SkillReport output

## Skill Definition Schema

```yaml
name: skill-name  # kebab-case, unique identifier
description: Short description of what the skill does

prompt: |
  Detailed instructions for the Claude agent.
  - What to analyze
  - What to look for
  - How to categorize findings
  - Severity guidelines

tools:
  allowed:  # Tools the skill CAN use
    - Read
    - Grep
    - Glob
    - WebFetch
    - WebSearch
  denied:   # Tools the skill CANNOT use
    - Write
    - Edit
    - Bash
```

## Available Tools

| Tool | Purpose | When to Allow |
|------|---------|---------------|
| Read | Read file contents | Analysis skills (always) |
| Grep | Search file contents | Finding patterns/issues |
| Glob | Find files by pattern | Discovering relevant files |
| WebFetch | Fetch URL content | CVE lookups, doc references |
| WebSearch | Web search | External information |
| Write | Create files | NEVER for review skills |
| Edit | Modify files | Auto-fix skills only |
| Bash | Run commands | Test runners, builds |

## Severity Guidelines

Instruct skills to use these severity levels:

- **critical**: Actively exploitable, high impact, immediate action required
- **high**: Exploitable with moderate effort, should fix before merge
- **medium**: Potential issue, needs review and consideration
- **low**: Minor concern, fix when convenient
- **info**: Observation, no action required

## Output Schema

All skills must output a SkillReport:

```typescript
{
  skill: string;      // Skill name
  summary: string;    // Brief overview of findings
  findings: [{
    id: string;       // Unique finding ID
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;    // Short title
    description: string; // Detailed explanation
    location?: {      // Where the issue is
      path: string;
      startLine: number;
      endLine?: number;
    };
    suggestedFix?: {  // Optional fix
      description: string;
      diff: string;   // Unified diff format
    };
  }];
  metadata?: Record<string, unknown>;
}
```

## Example Output

When asked to create a skill, output the complete YAML:

```yaml
name: test-coverage
description: Check if new code has adequate test coverage

prompt: |
  You are a test coverage analyst. Review the PR changes and check:

  1. New functions/methods have corresponding tests
  2. Edge cases are covered
  3. Error paths are tested
  4. Test names are descriptive

  Focus on:
  - New code additions (not modifications to existing tests)
  - Public APIs and exported functions
  - Complex logic branches

  Severity levels:
  - high: Public API with no tests
  - medium: Complex logic without edge case tests
  - low: Missing negative/error case tests
  - info: Suggestions for additional coverage

tools:
  allowed:
    - Read
    - Grep
    - Glob
  denied:
    - Write
    - Edit
    - Bash
    - WebFetch
    - WebSearch
```

## Process

1. Ask clarifying questions if the skill purpose is unclear
2. Generate the skill YAML
3. Explain any design decisions
4. Offer to refine based on feedback
