# security-review-prompt-injection-llm-behavior Child Skill Sources

## Superwarden Context

**Parent Skill**: `security-review`

**Parent Plan Hash**: `ee8c7caaa9a44aa287541e9a740390a25742da9f99572d37d4a9a26ac7ddf91f`

**Task ID**: `prompt-injection-llm-behavior`

**Task Definition** (from parent Superwarden plan):

```json
{
  "id": "prompt-injection-llm-behavior",
  "title": "Prompt Injection and LLM Behavior Manipulation",
  "scope": "Detect prompt injection vulnerabilities in changed TypeScript code where untrusted input can alter Warden's LLM behavior, leak sensitive context, or bypass intended skill constraints through direct or indirect prompt manipulation.",
  "evidenceRequirements": [
    "Anchor each finding to specific changed line numbers where untrusted input flows into prompt construction without sanitization",
    "Include concrete data-flow trace from untrusted input (PR content, file content, config value) to vulnerable prompt operation",
    "Reference repository source for existing prompt construction patterns (SDK runtime, skill builder, tool invocation handler)",
    "Cite public documentation for LLM prompt injection mitigations (OWASP LLM Top 10, Claude API security, indirect injection patterns) when behavior affects the attack",
    "Provide realistic attack scenario showing how an attacker injects instructions, leaks context, or bypasses constraints",
    "Describe the smallest safe fix with concrete sanitization, structured format, or validation approach"
  ],
  "outOfScope": [
    "Generic LLM safety recommendations unrelated to changed prompt construction code",
    "Recommendations to use different LLM providers unless the changed code introduces a new prompt injection pattern",
    "LLM provider vulnerability reports unless the changed code introduces a new exploitable prompt construction path",
    "Prompt injection issues in unchanged code unless new data flow from changed lines triggers the vulnerability",
    "Theoretical instruction injection without evidence that changed code affects prompt construction"
  ]
}
```

## Repository Source Inspection

Local repository files inspected during child skill synthesis:

### Prompt Construction and LLM Interaction

- `src/sdk/prompt.ts`
  - `buildHunkSystemPrompt(skill)`: Constructs system prompt with structured XML tags (`<role>`, `<verification>`, `<skill_instructions>`, `<output_format>`, `<skill_resources>`)
  - `buildHunkUserPrompt(skill, hunk, prContext)`: Constructs user prompt including PR title/body (from `prContext.title`, `prContext.body` truncated to 1000 chars), other changed files list (up to `maxContextFiles`), hunk context via `formatHunkForAnalysis`
  - **Key pattern**: PR metadata flows directly into prompts without sanitization

- `src/coordinator/agentic.ts`
  - `runStructuredSuperwardenAgent(args)`: Passes caller-provided `systemPrompt` and `userPrompt` directly to SDK runtime
  - Allows Superwarden synthesis tasks to use `WebSearch`/`WebFetch` tools
  - **Key pattern**: No prompt sanitization at coordinator level

- `src/sdk/runtimes/claude.ts`
  - `claudeRuntime.runSkill(request)`: Passes `systemPrompt`, `userPrompt` to Claude Agent SDK `query` function
  - `resolveClaudeSkillTools(tools)`: Filters allowed/denied tools, returns `allowedTools`/`disallowedTools` arrays
  - SDK options include `permissionMode: 'bypassPermissions'`, `persistSession: false`
  - **Key pattern**: Tool permissions enforced at SDK level, no runtime parameter validation

- `src/sdk/analyze.ts`
  - `analyzeHunk(skill, hunkCtx, repoPath, options, callbacks, prContext)`: Calls `buildHunkSystemPrompt`, `buildHunkUserPrompt`, passes to runtime
  - `parseHunkOutput(result, filename, options)`: Extracts findings JSON via regex or LLM fallback
  - `filterOutOfRangeFindings(findings, hunkRange)`: Defense-in-depth line range check
  - **Key pattern**: Output validation checks schema/line-range but not skill scope enforcement

### Skill Loading and Configuration

- `src/skills/loader.ts`
  - `loadSkillFromMarkdown(filePath, options)`: Parses YAML frontmatter (name, description, allowed-tools) and markdown body (prompt)
  - `parseMarkdownFrontmatter(content)`: Simple YAML parser for frontmatter
  - `resolveSkillAsync(nameOrPath, repoRoot, options)`: Resolves local or remote skills
  - **Key pattern**: Remote skill loading fetches markdown from external sources, parses into skill definition

- `src/config/schema.ts`
  - `ToolNameSchema`: Enum of allowed tool names (`Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, `WebFetch`, `WebSearch`)
  - `ToolConfigSchema`: `{ allowed?: ToolName[], denied?: ToolName[] }`
  - `SkillDefinitionSchema`: `{ name, description, prompt, tools?, rootDir? }`

### Output Extraction and Validation

- `src/sdk/extract.ts`
  - `extractFindingsJson(rawText)`: Regex-based JSON extraction from LLM output
  - `extractFindingsWithLLM(rawText, options)`: LLM fallback for malformed output (uses auxiliary Haiku call)
  - `validateFindings(findings, filename)`: Zod schema validation, location normalization
  - **Key pattern**: Output parsing but no content filtering for sensitive data leakage

## External Sources Consulted

Public documentation and research on LLM prompt injection (2026):

### OWASP LLM Top 10 2025/2026

- **Status**: Prompt Injection remains #1 critical vulnerability
- **Prevalence**: 73% in production AI deployments (2025 data)
- **Attack types**:
  - **Direct**: User prompt directly changes LLM behavior in unintended ways
  - **Indirect**: LLM accepts input from external source (websites, files) that alters behavior
- **Mitigation strategies**:
  - System prompt design with specific role, capabilities, limitations
  - Input validation and filtering of known attack patterns
  - Content segregation and untrusted-data marking
  - Guardrail models (Llama Guard, ShieldGemma, IBM Granite Guardian, Prompt Guard, NVIDIA NeMo Guardrails)
  - Testing and monitoring with prompt injection frameworks
  - Human review for high-risk outputs
- **Limitations**: No fool-proof prevention due to stochastic nature of generative AI

**Sources**:

- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Top 10 for LLMs 2025 PDF](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)

### Claude API Security and Structured Prompts (2026)

- **XML tags for structure**: Use `<instructions>`, `<context>`, `<input>` to separate instructions from data
- **Pattern recognition**: Claude recognizes XML format natively (Anthropic uses internally)
- **Security limitations**: Structured formats reduce misinterpretation but don't create security boundaries
- **Architecture guidance**: Separate system instructions from retrieved content, avoid blindly concatenating external documents
- **Prompt injection challenge**: Structural issue—LLMs don't enforce strict boundaries between instructions and data

**Sources**:

- [Claude API: Use XML tags to structure your prompts](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags)
- [Claude API: Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
- [Prompt Injection & Claude Computer Use: 2026 Guide](https://datasciencedojo.com/blog/prompt-injection-explained/)
- [Prompt Injection and AI Agent Security Risks: A Claude Code Guide](https://www.truefoundry.com/blog/claude-code-prompt-injection)

### Indirect Prompt Injection in the Wild (2026)

- **Threat escalation**: 32% increase in malicious attacks (Nov 2025 - Feb 2026)
- **Attack density**: 340% YoY increase in attack attempts vs 280% growth in enterprise AI deployments
- **Real-world incidents (2026)**:
  - **Perplexity Comet**: Reddit post with hidden text caused AI to leak user OTP to attacker server
  - **Cursor NomShub**: Malicious repository used indirect prompt injection to hijack developer machine
  - **Oasis "Claudy Day" (March 2026)**: Chained invisible prompt injection with data exfiltration to steal claude.ai conversation history
- **Attack surface**: Browsers, search engines, developer tools, customer-support bots, security scanners, agentic crawlers
- **Risk**: Indirect injection more dangerous—doesn't require direct AI interface access, spreads across systems, harder to detect

**Sources**:

- [Indirect prompt injection is taking hold in the wild](https://www.helpnetsecurity.com/2026/04/24/indirect-prompt-injection-in-the-wild/)
- [Google: AI threats in the wild: The current state of prompt injections on the web](https://security.googleblog.com/2026/04/ai-threats-in-wild-current-state-of.html)
- [Palo Alto Networks: Fooling AI Agents: Web-Based Indirect Prompt Injection Observed in the Wild](https://unit42.paloaltonetworks.com/ai-agent-prompt-injection/)
- [AI Prompt Injection Attacks (Examples & Prevention)](https://securityboulevard.com/2026/04/ai-prompt-injection-attacks-examples-prevention-grip/)

## Synthesis Decisions

### Data Flow Focus

Child skill focuses on five data-flow paths where untrusted input can influence LLM behavior:

1. **PR metadata → prompts**: Title, body, file list in `buildHunkUserPrompt`
2. **File content → prompts**: Hunk diffs, skill resources, remote skill markdown
3. **Config values → prompts**: `warden.yaml`, skill YAML frontmatter
4. **Web-fetched data → prompts**: `WebFetch`/`WebSearch` tool results
5. **Tool invocations**: LLM-driven tool calls (Bash, Read, WebFetch, etc.)

### Evidence Requirements

Child skill requires:

- Changed-line anchoring to specific prompt construction sites
- Data-flow trace from untrusted input to vulnerable operation
- Repository source reference (prompt builders, SDK runtime, output validators)
- Public documentation citation (OWASP, Claude API, 2026 research) when behavior affects exploitability
- Realistic attack scenario (not theoretical)
- Smallest safe fix (concrete sanitization, delimiter, validation approach)

### Missing Context Handling

When repository context is insufficient (e.g., LLM provider output filtering, tool permission enforcement internals, Superwarden constraint validation), child skill instructs execution agent to:

- State missing context explicitly
- Describe required evidence
- Return empty findings array
- **Not speculate or invent facts**

### Scope Boundaries

Child skill excludes:

- Generic LLM safety recommendations unrelated to changed code
- LLM provider recommendations unless new prompt injection pattern
- Prompt injection in unchanged code unless new data flow triggers it
- Theoretical attacks without concrete changed-code evidence

## Missing Inputs

Context that would improve this child skill (not available during synthesis):

- **LLM provider output filtering**: Whether Claude API filters/sanitizes output to prevent context leakage (documentation unclear on built-in filtering)
- **Tool permission enforcement internals**: Runtime vs declaration-time validation in Claude Agent SDK, parameter sanitization in Bash/Read/Write tools
- **Superwarden constraint validation**: Whether child skill output is re-validated against task scope/out-of-scope by coordinator
- **Skill provenance verification**: Current signature, hash, or trust-on-first-use behavior for remote skill loading (affects remote skill injection risk)
