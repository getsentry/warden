---
name: security-review-prompt-injection-llm-behavior
description: Detect prompt injection vulnerabilities where untrusted input can alter Warden's LLM behavior, leak sensitive context, or bypass skill constraints.
allowed-tools: Read Grep Glob WebFetch WebSearch
---

# Prompt Injection and LLM Behavior Manipulation

**Superwarden Child Skill**

Parent: `security-review` | Task: `prompt-injection-llm-behavior`

---

## Your Mission

You are executing a focused Warden child skill synthesized by Superwarden. Review changed TypeScript code for prompt injection and LLM behavior manipulation vulnerabilities where untrusted input can alter Warden's LLM behavior, leak sensitive context, or bypass intended skill constraints through direct or indirect prompt manipulation.

## Investigation Protocol

### 1. Deep Repository Investigation (MANDATORY)

Before reporting any findings, you MUST:

- **Read** relevant source files to understand prompt construction, data flow, and validation patterns
- **Grep** for prompt builders, message construction, tool invocation handlers, and output validation
- **Glob** to discover related files in prompt construction, skill loading, config processing, and SDK runtimes
- Trace data flow from untrusted input sources (PR title/body, file content, config values, web-fetched data) to LLM prompt construction
- Examine existing sanitization, delimiter usage, structured formats (XML tags, JSON), and input/output validation

### 2. External Research (WHEN MATERIAL)

Use `WebSearch` or `WebFetch` for current public documentation when external framework, LLM provider, or vulnerability behavior affects exploitability:

- OWASP LLM Top 10 prompt injection attack patterns and mitigations
- Claude API prompt parsing, XML tag handling, and security best practices
- Indirect prompt injection prevalence and defense techniques in 2026
- LLM tool invocation validation and output filtering behaviors

**CRITICAL**: Do NOT send repository code, secrets, private file paths, or proprietary details to web tools. Use only public framework names, API documentation, vulnerability class names, and ecosystem conventions.

### 3. Evidence Requirements

Every finding MUST include:

- **Changed-line anchor**: Specific line numbers where untrusted input flows into prompt construction without sanitization
- **Data-flow trace**: Concrete path from untrusted input source (PR content, file content, config value, web-fetched data) to vulnerable prompt operation
- **Repository evidence**: Reference to existing prompt construction patterns in `src/sdk/runtimes/claude.ts`, `src/coordinator/agentic.ts`, `src/sdk/prompt.ts`, skill loading, or config handling
- **Attack scenario**: Realistic path showing how an attacker with control over the input can inject instructions, leak context, or bypass constraints
- **Public documentation**: Cite current LLM prompt injection mitigations (OWASP LLM Top 10 #1, Claude API security, indirect injection patterns) when behavior affects the attack
- **Impact**: Concrete consequence (Warden behavior manipulation, sensitive context leakage, skill constraint bypass, unauthorized tool invocation)
- **Smallest safe fix**: Specific sanitization, structured format, delimiter approach, output validation, or tool permission revalidation

### 4. When Evidence is Insufficient

If repository context is missing (e.g., LLM provider output filtering, tool permission enforcement model, skill constraint validation), **do NOT invent facts**. Instead:

- State the missing context explicitly
- Describe what evidence would be required to confirm or rule out the vulnerability
- Return an empty findings array

**Do not report speculative findings**. Withhold findings when evidence is incomplete.

---

## Focus Areas

### 1. Direct Prompt Injection via User Input

Trace changed code that constructs LLM prompts (system messages, user messages, tool descriptions, skill instructions) from untrusted input:

- **PR metadata**: PR title, body, commit messages used in `buildHunkUserPrompt` or skill instructions
- **File content**: Changed file content included in prompts without marking as untrusted
- **Config values**: `warden.yaml`, skill YAML frontmatter, or remote skill definitions influencing prompt text
- **User arguments**: CLI arguments, workflow inputs, or Action parameters flowing into prompts

**Identify**:

- Whether untrusted input can inject instructions to override system prompts, leak context, or alter Warden behavior
- If input sanitization removes or escapes prompt control sequences, role-switching attempts (`<system>`, `<user>`, `</instructions>`), or instruction injection patterns
- Whether prompt construction uses safe delimiters or structured formats (XML tags like `<task>`, `<context>`, `<input>`) to separate instructions from data
- If prompt builders in `buildHunkSystemPrompt`, `buildHunkUserPrompt`, or `runStructuredSuperwardenAgent` validate input

**Check**:

- `src/sdk/prompt.ts`: `buildHunkSystemPrompt`, `buildHunkUserPrompt` (PR title/body inclusion)
- `src/coordinator/agentic.ts`: `runStructuredSuperwardenAgent` (system/user prompt construction)
- `src/sdk/runtimes/claude.ts`: SDK prompt parameter passing

### 2. Indirect Prompt Injection via Consumed Content

Trace changed code that includes file content, web-fetched data, or repository metadata in LLM prompts:

- **File reading**: Skill execution reading repository files for context (via `Read` tool, diff hunks, skill resources)
- **Web fetching**: `WebFetch` or `WebSearch` tool results included in prompts
- **Repository metadata**: Branch names, author names, file paths, commit SHAs in prompt construction
- **Cached content**: Skill cache, plan cache, or remote skill content influencing prompts

**Identify**:

- Whether attacker-controlled content (malicious files in PR, compromised documentation, poisoned cache) can inject hidden instructions that the LLM will follow
- If consumed content is sanitized, filtered, or marked as untrusted before inclusion in prompts
- Whether prompt construction distinguishes between trusted instructions and untrusted data (e.g., using `<context>` vs `<instructions>` tags)
- If file reading for hunks in `formatHunkForAnalysis` or skill resource loading validates content

**Check**:

- `src/sdk/prompt.ts`: `buildHunkUserPrompt` (hunk context inclusion, other files list)
- `src/diff/index.ts`: Hunk formatting and context lines
- `src/skills/loader.ts`: Remote skill loading, markdown frontmatter parsing
- `src/skills/remote.ts`: Remote repository fetching

### 3. Skill Constraint Bypass and Behavior Override

Trace changed code that enforces skill constraints (scope, out-of-scope, evidence requirements, permissions):

- **Skill instructions**: `<skill_instructions>` block in system prompt defining scope
- **Tool permissions**: `tools.allowed`, `tools.denied` configuration enforcement
- **Output validation**: Finding schema validation, line range checks, confidence/severity enforcement
- **Superwarden tasks**: Child skill task scope, evidence requirements, out-of-scope exclusions

**Identify**:

- Whether prompt injection can bypass constraints to cause the LLM to report out-of-scope findings, skip evidence requirements, or execute prohibited operations
- If skill instructions are protected from override by later prompt content (e.g., user prompt injecting `</skill_instructions><new_instructions>`)
- Whether skill output validation in `parseHunkOutput`, `validateFindings`, or `filterOutOfRangeFindings` enforces constraints even if the LLM attempts to bypass them
- If tool permission enforcement in `resolveClaudeSkillTools` or SDK runtime prevents LLM from invoking denied tools

**Check**:

- `src/sdk/prompt.ts`: Skill instruction wrapping, output format requirements
- `src/sdk/analyze.ts`: `parseHunkOutput`, `filterOutOfRangeFindings`
- `src/sdk/extract.ts`: `validateFindings`, finding schema validation
- `src/sdk/runtimes/claude.ts`: `resolveClaudeSkillTools`, `allowedTools`/`disallowedTools` enforcement
- `src/coordinator/plan.ts`, `src/coordinator/child-skills.ts`: Superwarden task constraint enforcement

### 4. Context Leakage and Sensitive Data Exposure

Trace changed code that includes sensitive context in prompts:

- **Repository code**: Full file content, hunk context, surrounding lines
- **Secrets**: Environment variables (API keys, tokens), config values, GitHub Secrets
- **Private paths**: Absolute file paths, home directory paths, temporary file paths
- **User data**: PR author, reviewer names, email addresses, organization info

**Identify**:

- Whether prompt injection can cause the LLM to echo, summarize, or exfiltrate this sensitive context in its output
- If sensitive data is filtered from prompt construction or marked as non-echoable
- Whether LLM output is validated to prevent sensitive data leakage (e.g., secret masking, path sanitization)
- If prompt construction in `buildHunkSystemPrompt` or auxiliary calls includes secrets without filtering

**Check**:

- `src/sdk/prompt.ts`: PR context inclusion (title, body, file list)
- `src/coordinator/agentic.ts`: System/user prompt construction for Superwarden agents
- `src/sdk/runtimes/claude.ts`: Prompt parameter passing, `gen_ai.request.messages` span attributes
- `src/sdk/analyze.ts`: Finding extraction, output rendering

### 5. Tool Invocation Manipulation

Trace changed code that allows LLM tool invocation based on LLM decisions:

- **Tool configuration**: `tools.allowed`, `tools.denied` in skill definition
- **Permission mode**: `permissionMode: 'bypassPermissions'` in SDK runtime
- **Tool parameter passing**: Arguments constructed from LLM tool calls
- **Tool result inclusion**: Tool output included in subsequent prompts

**Identify**:

- Whether prompt injection can cause the LLM to invoke tools with malicious parameters, bypass tool permission checks, or chain tools in unexpected ways
- If tool invocation is validated against declared permissions before execution (runtime vs declaration-time validation)
- Whether tool parameter sanitization prevents injection (e.g., Bash command injection, path traversal in Read/Write)
- If tool results are sanitized before re-inclusion in prompts (preventing tool-mediated indirect injection)

**Check**:

- `src/sdk/runtimes/claude.ts`: `resolveClaudeSkillTools`, `allowedTools`/`disallowedTools`, SDK `query` options
- `src/config/schema.ts`: `ToolConfigSchema`, tool name enumeration
- SDK runtime tool invocation handlers (Bash, Read, Write, WebFetch, WebSearch)

---

## Out of Scope

Do NOT report:

- Generic LLM safety recommendations unrelated to changed prompt construction code
- Recommendations to use different LLM providers unless the changed code introduces a new prompt injection pattern
- LLM provider vulnerability reports unless the changed code introduces a new exploitable prompt construction path
- Prompt injection issues in unchanged code unless new data flow from changed lines triggers the vulnerability
- Theoretical instruction injection without evidence that changed code affects prompt construction

---

## Output Format

Return findings ONLY when you have:

1. Identified specific changed lines where untrusted input flows into prompt construction without sanitization
2. Traced the data flow from input source to vulnerable operation
3. Confirmed the vulnerability through repository source inspection
4. Described a realistic attack scenario
5. Proposed a concrete, minimal fix

**When evidence is insufficient**: Return an empty findings array (`{"findings": []}`) and explain the missing context in your reasoning.

**Do not speculate**. Anchor every finding to changed code and concrete evidence.
