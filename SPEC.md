# Warden Spec

## Overview

Warden is an event-driven agent that reacts to GitHub events (Pull Requests, Issues, etc.) and executes configured skills using Claude Code SDK to produce structured reports. These reports are then translated into GitHub actions like inline comments, suggested changes, labels, or status checks.

**Key Decisions:**
- **Runtime**: GitHub Action (primary), with Cloudflare/Vercel webhook option
- **LLM Execution**: Claude Code SDK (spawns agents per skill)
- **Configuration**: In-repo `warden.yaml` with optional central defaults
- **Tech Stack**: TypeScript/Node.js

## Core Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Trigger   │────▶│    Config    │────▶│  Claude     │────▶│    Output    │
│ (GH Action  │     │   Resolver   │     │  Code SDK   │     │   Renderer   │
│ or Webhook) │     │              │     │   Agent     │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                           │                    │                    │
                           ▼                    ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
                    │  warden.yaml │     │   Skills    │     │   GitHub     │
                    │  (in-repo)   │     │  (prompts)  │     │     API      │
                    └──────────────┘     └─────────────┘     └──────────────┘
```

## Components

### 1. Event Ingestion

Receives GitHub webhooks and normalizes them into internal event types.

**Supported Events:**
- `pull_request` (opened, synchronize, reopened, closed)
- `issues` (opened, edited, closed)
- `issue_comment` (created, edited)
- `pull_request_review` (submitted)
- `pull_request_review_comment` (created)

### 2. Configuration System

Maps events to skills via declarative configuration.

```yaml
# Example: warden.yaml
version: 1

triggers:
  - name: "Security Review on PR"
    event: pull_request
    actions: [opened, synchronize]
    skills:
      - identify-security-vuln
      - check-dependencies

  - name: "Code Review"
    event: pull_request
    actions: [opened]
    skills:
      - code-review
    filters:
      paths:
        - "src/**/*.ts"
```

### 3. Skill System

Skills are defined as configurations that get executed via Claude Code SDK. Each skill is essentially:
- A system prompt defining the agent's purpose
- Tool restrictions (what the agent can/cannot do)
- Output schema for structured results

**Skill Definition:**
```yaml
# skills/security-review.yaml
name: security-review
description: Identify security vulnerabilities in code changes

prompt: |
  You are a security reviewer. Analyze the PR diff for:
  - Injection vulnerabilities (SQL, XSS, command injection)
  - Authentication/authorization issues
  - Secrets or credentials in code
  - Insecure dependencies

  Return findings in the specified JSON schema.

tools:
  allowed:
    - Read
    - Grep
    - Glob
    - WebFetch  # for checking CVE databases
  denied:
    - Write
    - Edit
    - Bash

output_schema: SkillReport  # references shared schema
```

**Built-in Skills (examples):**
- `security-review` - Scan for security vulnerabilities (used for dogfooding Warden itself)
- `code-review` - General code quality feedback
- `dependency-check` - Check for outdated/vulnerable deps
- `test-coverage` - Analyze if new code has tests
- `documentation-check` - Ensure public APIs are documented

**Custom Skills:**
Users can define custom skills in their repo under `.warden/skills/`

### 3a. Internal Meta-Skills (for development)

Warden includes internal skills (in `.claude/skills/`) that help **design and validate new skills**. These are not user-facing skills that run on PRs - they're development aids.

**skill-writer** - Helps create correct skill definitions:
- Takes a natural language description of what the skill should do
- Generates a valid skill YAML with proper prompt engineering
- Ensures output schema compliance
- Suggests appropriate tool restrictions

This mirrors Claude's own skill-writer pattern and helps bootstrap new skills correctly.

### 4. Skill Report (Structured Output)

```typescript
interface SkillReport {
  skill: string;
  summary: string;
  findings: Finding[];
  metadata?: Record<string, unknown>;
}

interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location?: {
    path: string;
    startLine: number;
    endLine?: number;
  };
  suggestedFix?: {
    description: string;
    diff: string;  // unified diff format
  };
  labels?: string[];  // suggested labels to add
}
```

### 5. Output Renderer

Translates SkillReport into GitHub API calls.

**Output Types:**
- **PR Review Comment**: Inline comment on specific lines
- **PR Review**: Overall review with approve/request-changes/comment
- **Suggested Change**: GitHub's suggestion block format
- **Issue Comment**: General comment on issue/PR
- **Labels**: Add/remove labels
- **Status Check**: Pass/fail status with details URL

---

## Trigger Mechanisms

### Option A: GitHub Action (Recommended for MVP)

```yaml
# .github/workflows/warden.yml
name: Warden
on:
  pull_request:
    types: [opened, synchronize, reopened]
  issues:
    types: [opened]

jobs:
  warden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/warden-action@v1
        with:
          anthropic-api-key: ${{ secrets.WARDEN_ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Pros:** No infrastructure to maintain, familiar to users, runs in repo context
**Cons:** Cold start latency, limited to GitHub Action runtime constraints

### Option B: Webhook Service (Cloudflare/Vercel)

For orgs wanting faster response times or central management.

```
GitHub App webhook → Cloudflare Worker → Clone repo → Run Warden → Post results
```

---

## Claude Code SDK Integration

Warden uses the Claude Code SDK to spawn agents for each skill:

```typescript
import { ClaudeCode } from '@anthropic-ai/claude-code';

async function runSkill(skill: SkillConfig, context: EventContext): Promise<SkillReport> {
  const claude = new ClaudeCode({
    apiKey: process.env.WARDEN_ANTHROPIC_API_KEY,
  });

  const session = await claude.createSession({
    systemPrompt: skill.prompt,
    tools: skill.tools,
    workingDirectory: context.repoPath,
  });

  // Provide context about the PR/issue
  const result = await session.run(`
    Analyze this pull request:
    - Title: ${context.pr.title}
    - Description: ${context.pr.body}
    - Files changed: ${context.pr.files.map(f => f.filename).join(', ')}

    The diff is available in the working directory.
    Return your findings as JSON matching the SkillReport schema.
  `);

  return parseSkillReport(result);
}
```

---

## MVP Scope

**In Scope:**
- GitHub Action trigger only (no webhook service yet)
- `pull_request` events (opened, synchronize)
- One built-in skill: `security-review` (for dogfooding on Warden's own PRs)
- Internal meta-skill: `skill-writer` (to help design correct skills)
- Three output types: inline comments, suggested changes, summary comment
- In-repo `warden.yaml` configuration
- One-shot analysis (no conversation follow-ups)

**Out of Scope (Future):**
- Webhook service (Cloudflare/Vercel)
- Issue events
- Conversation mode (responding to replies)
- Additional built-in skills
- Central/org-level configuration
- Caching/incremental analysis

---

## Open Questions (for future consideration)

1. **Rate Limiting**: How to handle API rate limits when many PRs open simultaneously?
2. **Caching**: Should we cache analysis of unchanged files across PR updates?
3. **Incremental Analysis**: On `synchronize` events, only analyze new commits or full diff?
