# security-review-prompt-injection-llm-behavior Child Skill Specification

## Intent

This is a Superwarden child skill synthesized from the parent `security-review` skill for task `prompt-injection-llm-behavior`.

It detects prompt injection vulnerabilities in changed TypeScript code where untrusted input can alter Warden's LLM behavior, leak sensitive context, or bypass intended skill constraints through direct or indirect prompt manipulation.

## Scope

### In Scope

Vulnerabilities in changed TypeScript code affecting:

1. **Direct Prompt Injection via User Input**
   - PR title, body, commit messages, file paths, branch names used in prompt construction
   - Config values from `warden.yaml`, skill YAML frontmatter, or remote skills
   - User arguments from CLI, workflow inputs, or Action parameters
   - Untrusted input flowing into system messages, user messages, tool descriptions, or skill instructions
   - Missing sanitization, delimiter usage, or structured format (XML tags, JSON) to separate instructions from data
   - Prompt control sequences, role-switching attempts, or instruction injection patterns

2. **Indirect Prompt Injection via Consumed Content**
   - File content read from repository (hunks, full files, skill resources)
   - Web-fetched data from `WebFetch` or `WebSearch` tools
   - Repository metadata (branch names, author names, file paths, commit SHAs)
   - Cached content (skill cache, plan cache, remote skill definitions)
   - Attacker-controlled content injecting hidden instructions in consumed files or web pages
   - Missing content sanitization, filtering, or untrusted-data marking before prompt inclusion

3. **Skill Constraint Bypass and Behavior Override**
   - Skill scope, out-of-scope, evidence requirements, permission constraints
   - Tool permission configuration (`tools.allowed`, `tools.denied`)
   - Output validation (finding schema, line range checks, confidence/severity enforcement)
   - Superwarden task constraints (scope, evidence requirements, out-of-scope exclusions)
   - Prompt injection bypassing constraints to report out-of-scope findings, skip evidence, or execute prohibited operations
   - Missing protection of skill instructions from override by later prompt content

4. **Context Leakage and Sensitive Data Exposure**
   - Repository code, hunk context, surrounding lines in prompts
   - Secrets (environment variables, API keys, tokens, GitHub Secrets)
   - Private file paths, home directory paths, temporary file paths
   - User data (PR author, reviewer names, email addresses, organization info)
   - Prompt injection causing LLM to echo, summarize, or exfiltrate sensitive context
   - Missing sensitive data filtering or non-echoable marking in prompt construction

5. **Tool Invocation Manipulation**
   - LLM tool invocation (Bash, Read, Write, Grep, Glob, WebFetch, WebSearch)
   - Tool parameter construction from LLM decisions
   - Tool permission enforcement (runtime vs declaration-time validation)
   - Tool result sanitization before re-inclusion in prompts
   - Prompt injection causing malicious tool invocations, parameter injection, or tool chaining

### Out of Scope

- Generic LLM safety recommendations unrelated to changed prompt construction code
- Recommendations to use different LLM providers unless the changed code introduces a new prompt injection pattern
- LLM provider vulnerability reports unless the changed code introduces a new exploitable prompt construction path
- Prompt injection issues in unchanged code unless new data flow from changed lines triggers the vulnerability
- Theoretical instruction injection without evidence that changed code affects prompt construction
- Generic code style, linting, or hardening unrelated to prompt injection
- Dependency freshness reports without a changed-code exploit path

## Key Repository Patterns

Based on repository inspection, Warden's prompt construction and LLM interaction patterns:

### Prompt Construction

- **System prompt builder**: `src/sdk/prompt.ts` `buildHunkSystemPrompt(skill)`
  - Wraps skill instructions in `<skill_instructions>` XML tag
  - Defines output format with JSON schema requirements
  - Includes verification requirements and role definition
  - Uses structured sections: `<role>`, `<verification>`, `<skill_instructions>`, `<output_format>`, `<skill_resources>`

- **User prompt builder**: `src/sdk/prompt.ts` `buildHunkUserPrompt(skill, hunk, prContext)`
  - Includes PR title and body (truncated to 1000 chars) from `prContext`
  - Lists other changed files in PR (up to `maxContextFiles`, default 50)
  - Includes hunk context via `formatHunkForAnalysis(hunkCtx)`
  - Adds final instruction: "Only report findings that are explicitly covered by the skill instructions"

- **Superwarden agent prompts**: `src/coordinator/agentic.ts` `runStructuredSuperwardenAgent(args)`
  - Constructs system and user prompts from caller-provided strings
  - Passes prompts directly to SDK runtime without sanitization
  - Allows Superwarden synthesis tasks to include external research via `WebSearch`/`WebFetch`

### Data Flow Paths (Untrusted Input)

1. **PR metadata → prompts**:
   - `context.pullRequest.title` → `prContext.title` → `buildHunkUserPrompt` → user message
   - `context.pullRequest.body` → `prContext.body` → `buildHunkUserPrompt` → user message (truncated)
   - `context.pullRequest.files.map(f => f.filename)` → `prContext.changedFiles` → "Other Files" list

2. **File content → prompts**:
   - Hunk diff lines → `formatHunkForAnalysis` → `buildHunkUserPrompt` → user message
   - Skill resource files (scripts/, references/, assets/) → `Read` tool → LLM context
   - Remote skill markdown → `loadSkillFromMarkdown` → skill definition (name, description, prompt body)

3. **Config values → prompts**:
   - `warden.yaml` skill configuration → skill definition
   - Skill YAML frontmatter → skill name, description, allowed-tools
   - Remote skill URL → fetched markdown → skill definition

4. **Web-fetched data → prompts**:
   - `WebFetch`/`WebSearch` tool results → LLM context (for Superwarden synthesis and skills with web tools)

### Existing Mitigations

- **Structured XML tags**: System prompt uses `<role>`, `<verification>`, `<skill_instructions>`, `<output_format>` to delimit sections
- **Output schema validation**: `extractFindingsJson` parses JSON output, `validateFindings` checks schema
- **Line range filtering**: `filterOutOfRangeFindings` drops findings outside hunk range (defense-in-depth)
- **Tool permission enforcement**: `resolveClaudeSkillTools` filters allowed/denied tools, SDK passes `allowedTools`/`disallowedTools` to runtime
- **Read-only default**: Skills default to `['Read', 'Grep', 'Glob']` read-only tools; mutating tools `['Write', 'Edit', 'Bash']` explicitly denied
- **Permission bypass mode**: SDK uses `permissionMode: 'bypassPermissions'` (assumes skill declaration is trusted)

### Missing Mitigations (Potential Vulnerabilities)

- **No input sanitization**: PR title, body, file paths, branch names flow directly into prompts without escaping or validation
- **No untrusted-data markers**: Consumed content (file hunks, web-fetched data) not marked as untrusted or wrapped in defensive delimiters
- **No output content filtering**: LLM output (findings, verification text) not scanned for echoed secrets or sensitive paths
- **No tool parameter validation**: Tool invocations (Read paths, Bash commands, WebFetch URLs) rely on SDK/runtime enforcement, not skill-level validation
- **No skill constraint revalidation**: Output validation checks schema/line-range but doesn't enforce skill scope/out-of-scope boundaries

## Evidence Requirements

Every finding MUST include:

1. **Changed-line anchor**: Specific line numbers where untrusted input flows into prompt construction without sanitization
2. **Data-flow trace**: Concrete path from untrusted input source (PR content, file content, config value, web-fetched data) to vulnerable prompt operation
3. **Repository source reference**: Existing prompt construction patterns in:
   - `src/sdk/prompt.ts`: `buildHunkSystemPrompt`, `buildHunkUserPrompt`
   - `src/coordinator/agentic.ts`: `runStructuredSuperwardenAgent`
   - `src/sdk/runtimes/claude.ts`: SDK prompt parameter passing, tool permission resolution
   - `src/sdk/analyze.ts`: Output parsing, finding validation, line range filtering
   - `src/skills/loader.ts`: Skill loading, markdown frontmatter parsing
4. **Public documentation citation**: When framework/LLM provider behavior affects exploitability:
   - OWASP LLM Top 10 #1 (Prompt Injection) attack patterns and mitigations
   - Claude API security best practices (XML tag handling, structured prompts, output filtering)
   - Indirect injection prevalence and defense techniques (2026 research)
5. **Attack scenario**: Realistic path showing how an attacker with control over the input can inject instructions, leak context, or bypass constraints
6. **Smallest safe fix**: Concrete sanitization, structured format, delimiter approach, output validation, or tool permission revalidation

## When Context is Missing

If repository context is insufficient to determine prompt injection risk:

- **LLM provider output filtering**: Whether Claude API filters/sanitizes output to prevent context leakage
- **Tool permission enforcement model**: Runtime vs declaration-time validation, parameter sanitization in SDK tools
- **Skill constraint validation**: Whether Superwarden child skills enforce task scope/out-of-scope at output time

**Action**: State the missing context, describe required evidence, return empty findings array. Do NOT speculate.

## External Sources

Current public documentation on prompt injection (2026):

- **OWASP LLM Top 10 2025/2026**: Prompt Injection remains #1 risk with 73% prevalence in production AI deployments
- **Direct injection**: User prompt directly changes LLM behavior in unintended ways
- **Indirect injection**: LLM accepts input from external source (websites, files) that alters behavior
- **Mitigation strategies**:
  - Structured prompts with XML tags to separate instructions from data
  - Input validation and filtering of known attack patterns
  - Content segregation and untrusted-data marking
  - Guardrail models (Llama Guard, ShieldGemma, Prompt Guard)
  - Human review for high-risk outputs
- **Limitations**: No fool-proof prevention due to stochastic nature of generative AI

- **Claude API best practices (2026)**:
  - Use XML tags (`<instructions>`, `<context>`, `<input>`) to structure prompts
  - Separate system instructions from retrieved content
  - Avoid blindly concatenating external documents into prompts
  - Structured formats reduce misinterpretation but don't create security boundaries

- **Indirect injection prevalence (2026)**:
  - 32% increase in malicious attacks (Nov 2025 - Feb 2026)
  - 340% YoY increase in attack attempts
  - Real-world incidents: Reddit hidden text exfiltrating OTPs, Cursor repository hijacking (NomShub)
  - Attack surface: browsers, search engines, developer tools, customer-support bots, security scanners

## Reporting Contract

Every finding must:

- Reference changed line numbers where untrusted input flows into prompt construction
- Include concrete data-flow trace from input source to vulnerable operation
- Cite repository source for prompt construction patterns
- Cite public documentation when framework/LLM behavior affects the attack
- Provide realistic attack scenario
- Describe smallest safe fix

When evidence is insufficient:

- State missing context explicitly
- Describe required evidence
- Return empty findings array
- Do NOT invent facts or speculate
