# Changelog
## 0.37.0

### New Features ✨

- (jsonl) Add canonical usage breakdown accounting by @dcramer in [#388](https://github.com/getsentry/warden/pull/388)
- Remove suggestedFix feature entirely by @sentry-junior in [#389](https://github.com/getsentry/warden/pull/389)

### Bug Fixes 🐛

- (sdk) Force short Claude prompt cache TTL by @dcramer in [#387](https://github.com/getsentry/warden/pull/387)
- (warden) Capture runtime child spans in traces by @dcramer in [#393](https://github.com/getsentry/warden/pull/393)

### Documentation 📚

#### Benchmark

- Publish Opus 4.8 high comparison by @dcramer in [#395](https://github.com/getsentry/warden/pull/395)
- Publish Sonnet 4.6 runtime comparison by @dcramer in [#394](https://github.com/getsentry/warden/pull/394)

#### Other

- (benchmarking) Refresh Sentry corpus benchmark results by @dcramer in [#390](https://github.com/getsentry/warden/pull/390)
- (benchmarks) Add Sentry corpus benchmark by @dcramer in [#366](https://github.com/getsentry/warden/pull/366)

## 0.36.1

### Bug Fixes 🐛

- (sdk) Capture GenAI tool trace content by @dcramer in [#386](https://github.com/getsentry/warden/pull/386)

## 0.36.0

### New Features ✨

#### Cli

- Add explicit Claude runtime selection by @dcramer in [#384](https://github.com/getsentry/warden/pull/384)
- Add per-run effort option by @dcramer in [#383](https://github.com/getsentry/warden/pull/383)

#### Other

- (traces) Capture run traces in output by @dcramer in [#385](https://github.com/getsentry/warden/pull/385)

### Bug Fixes 🐛

- (circuit-breaker) Humanize provider error messages on circuit open by @sentry-junior in [#382](https://github.com/getsentry/warden/pull/382)

### Internal Changes 🔧

- (skills) Hoist warden skills to repo root ./skills/ by @sentry-junior in [#380](https://github.com/getsentry/warden/pull/380)

### Other

- Align GenAI telemetry with current OTel cache semantics by @dcramer in [#381](https://github.com/getsentry/warden/pull/381)

## 0.35.1

### Internal Changes 🔧

- (action) Validate release action layout by @dcramer in [#377](https://github.com/getsentry/warden/pull/377)

## 0.35.0

### New Features ✨

#### Triggers

- Add pull request label gating by @dcramer in [#359](https://github.com/getsentry/warden/pull/359)
- Support non-draft pull request filters by @dcramer in [#355](https://github.com/getsentry/warden/pull/355)

#### Other

- (config) Add agent reasoning effort option by @tmustier in [#373](https://github.com/getsentry/warden/pull/373)
- (warden) Emit reporting observations by @dcramer in [#362](https://github.com/getsentry/warden/pull/362)
- (workflow) Nightly model pricing update PR by @dcramer in [#361](https://github.com/getsentry/warden/pull/361)

### Bug Fixes 🐛

#### Sdk

- Runtime-aware auth errors and provider credential docs by @sentry-junior in [#369](https://github.com/getsentry/warden/pull/369)
- Allow Pi model IDs with slashes by @Destreyf in [#368](https://github.com/getsentry/warden/pull/368)

#### Workflow

- Stop impersonating release bot by @dcramer in [#376](https://github.com/getsentry/warden/pull/376)
- Use app token for pricing push by @dcramer in [#374](https://github.com/getsentry/warden/pull/374)

#### Other

- (cli) Rename --config to --config-path; handle directory input by @sentry-junior in [#365](https://github.com/getsentry/warden/pull/365)
- (fix-eval) Anchor fix evaluation to original comment commit by @sentry-junior in [#370](https://github.com/getsentry/warden/pull/370)

### Internal Changes 🔧

- (evals) Add real-world code review fixtures by @dcramer in [#363](https://github.com/getsentry/warden/pull/363)
- (monorepo) Move Warden into workspace package by @dcramer in [#357](https://github.com/getsentry/warden/pull/357)
- Update model pricing by @sentry-release-bot in [#375](https://github.com/getsentry/warden/pull/375)

## 0.34.0

### Bug Fixes 🐛

- (action) Report skipped PR trigger checks by @dcramer in [#353](https://github.com/getsentry/warden/pull/353)
- (docs) Remove stray sentryAgentMarkdown from shikiConfig by @sentry-junior in [#350](https://github.com/getsentry/warden/pull/350)

### Documentation 📚

- (config) Document model runtime selection by @dcramer in [#338](https://github.com/getsentry/warden/pull/338)
- Use tabbed install with dotagents as default by @sentry-junior in [#342](https://github.com/getsentry/warden/pull/342)
- Add architecture flow guide by @dcramer in [#339](https://github.com/getsentry/warden/pull/339)
- Migrate site docs to Starlight by @dcramer in [#337](https://github.com/getsentry/warden/pull/337)

### Internal Changes 🔧

#### Docs

- Bump @sentry/starlight-theme to 0.7.0 by @sentry-junior in [#352](https://github.com/getsentry/warden/pull/352)
- Bump @sentry/starlight-theme to ^0.5.0 by @sentry-junior in [#345](https://github.com/getsentry/warden/pull/345)
- Bump @sentry/starlight-theme to ^0.4.0 by @sentry-junior in [#343](https://github.com/getsentry/warden/pull/343)
- Update @sentry/starlight-theme to ^0.3.0 by @sentry-junior in [#341](https://github.com/getsentry/warden/pull/341)
- Bump starlight theme to 0.2.0, adopt key/value lists by @sentry-junior in [#340](https://github.com/getsentry/warden/pull/340)

#### Other

- (deps) Bump @sentry/starlight-theme to 0.6.0 and add sentryAgentMarkdown plugin by @sentry-junior in [#348](https://github.com/getsentry/warden/pull/348)
- (evals) Only trigger on eval path changes by @dcramer in [#347](https://github.com/getsentry/warden/pull/347)
- Update workspace dependencies by @dcramer in [#354](https://github.com/getsentry/warden/pull/354)
- Add docs build verification workflow by @dcramer in [#346](https://github.com/getsentry/warden/pull/346)

## 0.33.1

### Bug Fixes 🐛

- (cli) Avoid abort listener fanout by @dcramer in [#336](https://github.com/getsentry/warden/pull/336)

## 0.33.0

- No documented changes.

## 0.32.0

### Bug Fixes 🐛

- (action) Install Claude Code only for Claude runtime by @tmustier in [#334](https://github.com/getsentry/warden/pull/334)
- (output) Render finding evidence traces by @dcramer in [#335](https://github.com/getsentry/warden/pull/335)

### Internal Changes 🔧

#### Evals

- Upgrade vitest-evals to 0.9.0-beta.6 by @sentry-junior in [#332](https://github.com/getsentry/warden/pull/332)
- Move eval harness into workspace package by @dcramer in [#331](https://github.com/getsentry/warden/pull/331)
- Add vitest-evals reporter bug fixtures by @dcramer in [#330](https://github.com/getsentry/warden/pull/330)
- Centralize fixture provenance by @dcramer in [#329](https://github.com/getsentry/warden/pull/329)

#### Other

- (release) Create source tags before artifact tags by @dcramer in [#328](https://github.com/getsentry/warden/pull/328)

## 0.31.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Add @file target lists by @dcramer in [#316](https://github.com/getsentry/warden/pull/316)
- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add Pi runtime by @dcramer in [#318](https://github.com/getsentry/warden/pull/318)
- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Honor PR trigger parallelism by @dcramer in [#325](https://github.com/getsentry/warden/pull/325)
- Preload Pi node-only providers by @dcramer in [#324](https://github.com/getsentry/warden/pull/324)
- Validate Pi model selectors before execution by @dcramer in [#321](https://github.com/getsentry/warden/pull/321)
- Correct fix evaluation verdict handling by @dcramer in [#314](https://github.com/getsentry/warden/pull/314)
- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- Render GitHub footers as muted text by @dcramer in [#306](https://github.com/getsentry/warden/pull/306)
- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Fill finding analytics gaps by @dcramer in [#311](https://github.com/getsentry/warden/pull/311)
- Align attributes with OTel semantics by @dcramer in [#307](https://github.com/getsentry/warden/pull/307)
- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (code-review) Calibrate config severity by @dcramer in [#319](https://github.com/getsentry/warden/pull/319)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (reviews) Compact inline finding comments by @dcramer in [#315](https://github.com/getsentry/warden/pull/315)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Include auxiliary costs in total without separate breakdown by @sentry-junior in [#320](https://github.com/getsentry/warden/pull/320)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (evals) Add Warden baseline evals by @dcramer in [#327](https://github.com/getsentry/warden/pull/327)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.30.0 by @getsentry-bot in [c6c9f847](https://github.com/getsentry/warden/commit/c6c9f84722cb84f1013659a876e55a1881605b0d)
- release: 0.29.1 by @getsentry-bot in [73529a81](https://github.com/getsentry/warden/commit/73529a8199b27ce5c7618e29e5624835526bc09a)
- release: 0.29.0 by @getsentry-bot in [d6d153c1](https://github.com/getsentry/warden/commit/d6d153c1c02138207b62932a7f83515ba90fef3c)
- release: 0.28.0 by @getsentry-bot in [969283b9](https://github.com/getsentry/warden/commit/969283b9d652129d9b18585337d003899810a310)
- release: 0.27.0 by @getsentry-bot in [06a593e0](https://github.com/getsentry/warden/commit/06a593e0a43d4ea5c9af9176a9f555c7b9c965f6)
- release: 0.26.2 by @getsentry-bot in [3d492972](https://github.com/getsentry/warden/commit/3d492972d2e6ae5c2666a5d61d1e37a6591892ff)
- release: 0.26.1 by @getsentry-bot in [23280325](https://github.com/getsentry/warden/commit/23280325da28b365fb53e6a33b19b167998e5660)
- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)

_Plus 10 more_

## 0.30.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Add @file target lists by @dcramer in [#316](https://github.com/getsentry/warden/pull/316)
- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add Pi runtime by @dcramer in [#318](https://github.com/getsentry/warden/pull/318)
- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Honor PR trigger parallelism by @dcramer in [#325](https://github.com/getsentry/warden/pull/325)
- Preload Pi node-only providers by @dcramer in [#324](https://github.com/getsentry/warden/pull/324)
- Validate Pi model selectors before execution by @dcramer in [#321](https://github.com/getsentry/warden/pull/321)
- Correct fix evaluation verdict handling by @dcramer in [#314](https://github.com/getsentry/warden/pull/314)
- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- Render GitHub footers as muted text by @dcramer in [#306](https://github.com/getsentry/warden/pull/306)
- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Fill finding analytics gaps by @dcramer in [#311](https://github.com/getsentry/warden/pull/311)
- Align attributes with OTel semantics by @dcramer in [#307](https://github.com/getsentry/warden/pull/307)
- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (code-review) Calibrate config severity by @dcramer in [#319](https://github.com/getsentry/warden/pull/319)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (reviews) Compact inline finding comments by @dcramer in [#315](https://github.com/getsentry/warden/pull/315)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Include auxiliary costs in total without separate breakdown by @sentry-junior in [#320](https://github.com/getsentry/warden/pull/320)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.29.1 by @getsentry-bot in [73529a81](https://github.com/getsentry/warden/commit/73529a8199b27ce5c7618e29e5624835526bc09a)
- release: 0.29.0 by @getsentry-bot in [d6d153c1](https://github.com/getsentry/warden/commit/d6d153c1c02138207b62932a7f83515ba90fef3c)
- release: 0.28.0 by @getsentry-bot in [969283b9](https://github.com/getsentry/warden/commit/969283b9d652129d9b18585337d003899810a310)
- release: 0.27.0 by @getsentry-bot in [06a593e0](https://github.com/getsentry/warden/commit/06a593e0a43d4ea5c9af9176a9f555c7b9c965f6)
- release: 0.26.2 by @getsentry-bot in [3d492972](https://github.com/getsentry/warden/commit/3d492972d2e6ae5c2666a5d61d1e37a6591892ff)
- release: 0.26.1 by @getsentry-bot in [23280325](https://github.com/getsentry/warden/commit/23280325da28b365fb53e6a33b19b167998e5660)
- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)

_Plus 9 more_

## 0.29.1

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Add @file target lists by @dcramer in [#316](https://github.com/getsentry/warden/pull/316)
- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add Pi runtime by @dcramer in [#318](https://github.com/getsentry/warden/pull/318)
- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Validate Pi model selectors before execution by @dcramer in [#321](https://github.com/getsentry/warden/pull/321)
- Correct fix evaluation verdict handling by @dcramer in [#314](https://github.com/getsentry/warden/pull/314)
- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- Render GitHub footers as muted text by @dcramer in [#306](https://github.com/getsentry/warden/pull/306)
- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Fill finding analytics gaps by @dcramer in [#311](https://github.com/getsentry/warden/pull/311)
- Align attributes with OTel semantics by @dcramer in [#307](https://github.com/getsentry/warden/pull/307)
- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (code-review) Calibrate config severity by @dcramer in [#319](https://github.com/getsentry/warden/pull/319)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (reviews) Compact inline finding comments by @dcramer in [#315](https://github.com/getsentry/warden/pull/315)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Include auxiliary costs in total without separate breakdown by @sentry-junior in [#320](https://github.com/getsentry/warden/pull/320)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.29.0 by @getsentry-bot in [d6d153c1](https://github.com/getsentry/warden/commit/d6d153c1c02138207b62932a7f83515ba90fef3c)
- release: 0.28.0 by @getsentry-bot in [969283b9](https://github.com/getsentry/warden/commit/969283b9d652129d9b18585337d003899810a310)
- release: 0.27.0 by @getsentry-bot in [06a593e0](https://github.com/getsentry/warden/commit/06a593e0a43d4ea5c9af9176a9f555c7b9c965f6)
- release: 0.26.2 by @getsentry-bot in [3d492972](https://github.com/getsentry/warden/commit/3d492972d2e6ae5c2666a5d61d1e37a6591892ff)
- release: 0.26.1 by @getsentry-bot in [23280325](https://github.com/getsentry/warden/commit/23280325da28b365fb53e6a33b19b167998e5660)
- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)

_Plus 8 more_

## 0.29.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Add @file target lists by @dcramer in [#316](https://github.com/getsentry/warden/pull/316)
- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add Pi runtime by @dcramer in [#318](https://github.com/getsentry/warden/pull/318)
- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Correct fix evaluation verdict handling by @dcramer in [#314](https://github.com/getsentry/warden/pull/314)
- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- Render GitHub footers as muted text by @dcramer in [#306](https://github.com/getsentry/warden/pull/306)
- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Fill finding analytics gaps by @dcramer in [#311](https://github.com/getsentry/warden/pull/311)
- Align attributes with OTel semantics by @dcramer in [#307](https://github.com/getsentry/warden/pull/307)
- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (code-review) Calibrate config severity by @dcramer in [#319](https://github.com/getsentry/warden/pull/319)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (reviews) Compact inline finding comments by @dcramer in [#315](https://github.com/getsentry/warden/pull/315)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.28.0 by @getsentry-bot in [969283b9](https://github.com/getsentry/warden/commit/969283b9d652129d9b18585337d003899810a310)
- release: 0.27.0 by @getsentry-bot in [06a593e0](https://github.com/getsentry/warden/commit/06a593e0a43d4ea5c9af9176a9f555c7b9c965f6)
- release: 0.26.2 by @getsentry-bot in [3d492972](https://github.com/getsentry/warden/commit/3d492972d2e6ae5c2666a5d61d1e37a6591892ff)
- release: 0.26.1 by @getsentry-bot in [23280325](https://github.com/getsentry/warden/commit/23280325da28b365fb53e6a33b19b167998e5660)
- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)

_Plus 7 more_

## 0.28.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Correct fix evaluation verdict handling by @dcramer in [#314](https://github.com/getsentry/warden/pull/314)
- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- Render GitHub footers as muted text by @dcramer in [#306](https://github.com/getsentry/warden/pull/306)
- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Fill finding analytics gaps by @dcramer in [#311](https://github.com/getsentry/warden/pull/311)
- Align attributes with OTel semantics by @dcramer in [#307](https://github.com/getsentry/warden/pull/307)
- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (reviews) Compact inline finding comments by @dcramer in [#315](https://github.com/getsentry/warden/pull/315)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.27.0 by @getsentry-bot in [06a593e0](https://github.com/getsentry/warden/commit/06a593e0a43d4ea5c9af9176a9f555c7b9c965f6)
- release: 0.26.2 by @getsentry-bot in [3d492972](https://github.com/getsentry/warden/commit/3d492972d2e6ae5c2666a5d61d1e37a6591892ff)
- release: 0.26.1 by @getsentry-bot in [23280325](https://github.com/getsentry/warden/commit/23280325da28b365fb53e6a33b19b167998e5660)
- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)

_Plus 6 more_

## 0.27.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- Render GitHub footers as muted text by @dcramer in [#306](https://github.com/getsentry/warden/pull/306)
- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Fill finding analytics gaps by @dcramer in [#311](https://github.com/getsentry/warden/pull/311)
- Align attributes with OTel semantics by @dcramer in [#307](https://github.com/getsentry/warden/pull/307)
- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.26.2 by @getsentry-bot in [3d492972](https://github.com/getsentry/warden/commit/3d492972d2e6ae5c2666a5d61d1e37a6591892ff)
- release: 0.26.1 by @getsentry-bot in [23280325](https://github.com/getsentry/warden/commit/23280325da28b365fb53e6a33b19b167998e5660)
- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)

_Plus 5 more_

## 0.26.2

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- Render GitHub footers as muted text by @dcramer in [#306](https://github.com/getsentry/warden/pull/306)
- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.26.1 by @getsentry-bot in [23280325](https://github.com/getsentry/warden/commit/23280325da28b365fb53e6a33b19b167998e5660)
- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)

_Plus 4 more_

## 0.26.1

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Allow base configs to use built-in skills by @dcramer in [#305](https://github.com/getsentry/warden/pull/305)
- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.26.0 by @getsentry-bot in [2bb08b9d](https://github.com/getsentry/warden/commit/2bb08b9d5b276abaee31aab0e672d3ac4ecaee8c)
- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)

_Plus 3 more_

## 0.26.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Config

- Warn on duplicate layered skills by @dcramer in [#304](https://github.com/getsentry/warden/pull/304)
- Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (sentry) Tag action errors with repository by @dcramer in [#303](https://github.com/getsentry/warden/pull/303)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Config

- Use native PR review skills by @dcramer in [#299](https://github.com/getsentry/warden/pull/299)
- Configure Sentry MCP server by @dcramer in [#301](https://github.com/getsentry/warden/pull/301)
- Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.25.0 by @getsentry-bot in [56de18fe](https://github.com/getsentry/warden/commit/56de18fee0a1bb6a80deae2c0e4688ab05754126)
- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)
- release: 0.8.0 by @getsentry-bot in [7f71a98d](https://github.com/getsentry/warden/commit/7f71a98d931a128ba936df2ff5b73a72a987e6ab)

_Plus 2 more_

## 0.25.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in code review skill by @dcramer in [#298](https://github.com/getsentry/warden/pull/298)
- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (config) Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (config) Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.24.1 by @getsentry-bot in [2b9e2b0c](https://github.com/getsentry/warden/commit/2b9e2b0cdab12b950fcb4abc79e33d7db363ee49)
- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)
- release: 0.8.0 by @getsentry-bot in [7f71a98d](https://github.com/getsentry/warden/commit/7f71a98d931a128ba936df2ff5b73a72a987e6ab)
- release: 0.7.0 by @getsentry-bot in [b6e61976](https://github.com/getsentry/warden/commit/b6e6197647e44211f5d1a30788d0c6792e24c97a)

_Plus 1 more_

## 0.24.1

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (config) Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Preserve interrupted findings and parse run args by @dcramer in [#297](https://github.com/getsentry/warden/pull/297)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (config) Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.24.0 by @getsentry-bot in [715259ec](https://github.com/getsentry/warden/commit/715259ecacc9e1e5d78b6b62623960d86e934162)
- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)
- release: 0.8.0 by @getsentry-bot in [7f71a98d](https://github.com/getsentry/warden/commit/7f71a98d931a128ba936df2ff5b73a72a987e6ab)
- release: 0.7.0 by @getsentry-bot in [b6e61976](https://github.com/getsentry/warden/commit/b6e6197647e44211f5d1a30788d0c6792e24c97a)
- Remove dist/action from main, build at release time by @dcramer in [#101](https://github.com/getsentry/warden/pull/101)

## 0.24.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Label built-in skill sources by @dcramer in [#294](https://github.com/getsentry/warden/pull/294)
- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (config) Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use built-in security review in samples by @dcramer in [#295](https://github.com/getsentry/warden/pull/295)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Deps

- Bump dotagents lib by @gricha in [#296](https://github.com/getsentry/warden/pull/296)
- Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (config) Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.23.0 by @getsentry-bot in [dd7f76ac](https://github.com/getsentry/warden/commit/dd7f76ac25cd8d70f2557638bd8d8678d9776e96)
- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)
- release: 0.8.0 by @getsentry-bot in [7f71a98d](https://github.com/getsentry/warden/commit/7f71a98d931a128ba936df2ff5b73a72a987e6ab)
- release: 0.7.0 by @getsentry-bot in [b6e61976](https://github.com/getsentry/warden/commit/b6e6197647e44211f5d1a30788d0c6792e24c97a)
- Remove dist/action from main, build at release time by @dcramer in [#101](https://github.com/getsentry/warden/pull/101)

## 0.23.0

### New Features ✨

#### Action

- Support org base configs with repo overlays by @dcramer in [#279](https://github.com/getsentry/warden/pull/279)
- Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)

#### Cli

- Build generated skills from path targets by @dcramer in [#282](https://github.com/getsentry/warden/pull/282)
- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Sdk

- Add finding verification pass by @dcramer in [#290](https://github.com/getsentry/warden/pull/290)
- Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)

#### Skills

- Add built-in security review skill by @dcramer in [#292](https://github.com/getsentry/warden/pull/292)
- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (skill-builder) Build generated repo-local skills by @dcramer in [#280](https://github.com/getsentry/warden/pull/280)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Use relative findings output path by @dcramer in [#289](https://github.com/getsentry/warden/pull/289)
- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Report final per-file finding counts by @dcramer in [#293](https://github.com/getsentry/warden/pull/293)
- Align local review diff context by @dcramer in [#276](https://github.com/getsentry/warden/pull/276)
- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Short-circuit repeated provider failures by @dcramer in [#291](https://github.com/getsentry/warden/pull/291)
- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (config) Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (skill-builder) Stabilize generated skill authoring by @dcramer in [#284](https://github.com/getsentry/warden/pull/284)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Prevent command injection in release workflow by @fix-it-felix-sentry in [#277](https://github.com/getsentry/warden/pull/277)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

#### Sdk

- Add flat runtime provider contract by @dcramer in [#270](https://github.com/getsentry/warden/pull/270)
- Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)

#### Skills

- Adopt @sentry/dotagents-lib for skill resolution primitives by @gricha in [#285](https://github.com/getsentry/warden/pull/285)
- Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)

#### Other

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (config) Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)
- (deps) Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (skill-builder) Use internal authoring provider by @dcramer in [#283](https://github.com/getsentry/warden/pull/283)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add GitHub Actions workflow skill by @dcramer in [#278](https://github.com/getsentry/warden/pull/278)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.22.0 by @getsentry-bot in [08a3b2f0](https://github.com/getsentry/warden/commit/08a3b2f0139248c80ba499038320556bedb66347)
- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)
- release: 0.8.0 by @getsentry-bot in [7f71a98d](https://github.com/getsentry/warden/commit/7f71a98d931a128ba936df2ff5b73a72a987e6ab)
- release: 0.7.0 by @getsentry-bot in [b6e61976](https://github.com/getsentry/warden/commit/b6e6197647e44211f5d1a30788d0c6792e24c97a)
- Remove dist/action from main, build at release time by @dcramer in [#101](https://github.com/getsentry/warden/pull/101)

## 0.22.0

### New Features ✨

#### Cli

- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Runs

- Write chunk-level JSONL logs by @dcramer in [#265](https://github.com/getsentry/warden/pull/265)
- Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)

#### Skills

- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (action) Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)
- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (sdk) Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (config) Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (review) Preserve active Warden threads by @dcramer in [#272](https://github.com/getsentry/warden/pull/272)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Use scoped Warden package in npx examples by @dcramer in [#273](https://github.com/getsentry/warden/pull/273)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (config) Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)
- (deps) Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (sdk) Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)
- (skills) Restructure distributed Warden skills by @dcramer in [#268](https://github.com/getsentry/warden/pull/268)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- release: 0.21.0 by @getsentry-bot in [2795626e](https://github.com/getsentry/warden/commit/2795626e8f1ff3c5a7a041d0ecb9ae3c047641cd)
- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)
- release: 0.8.0 by @getsentry-bot in [7f71a98d](https://github.com/getsentry/warden/commit/7f71a98d931a128ba936df2ff5b73a72a987e6ab)
- release: 0.7.0 by @getsentry-bot in [b6e61976](https://github.com/getsentry/warden/commit/b6e6197647e44211f5d1a30788d0c6792e24c97a)
- Remove dist/action from main, build at release time by @dcramer in [#101](https://github.com/getsentry/warden/pull/101)

## 0.21.0

### New Features ✨

#### Cli

- Add --staged flag and default to HEAD for uncommitted changes by @dcramer in [#205](https://github.com/getsentry/warden/pull/205)
- Display confidence level in findings output by @dcramer in [#194](https://github.com/getsentry/warden/pull/194)
- Always-on JSONL logging with repo-local log directory by @dcramer in [#179](https://github.com/getsentry/warden/pull/179)
- Add --fail-fast flag to stop after first finding by @dcramer in [#174](https://github.com/getsentry/warden/pull/174)
- Surface failure details for chunk analysis and finding extraction by @dcramer in [#162](https://github.com/getsentry/warden/pull/162)
- Interactive fix step-through with y/n/a/s/q prompt by @dcramer in [#161](https://github.com/getsentry/warden/pull/161)

#### Docs

- Improved landing visuals by @PickleNik in [#245](https://github.com/getsentry/warden/pull/245)
- Add LLM content negotiation and llms.txt by @dcramer in [#178](https://github.com/getsentry/warden/pull/178)

#### Skills

- Consolidate warden-sweep into bundled scripts with prescribed reporting by @dcramer in [#201](https://github.com/getsentry/warden/pull/201)
- Replace notseer with find-warden-bugs skill by @dcramer in [#200](https://github.com/getsentry/warden/pull/200)
- Add warden-sweep skill and bundled skill installation by @dcramer in [#196](https://github.com/getsentry/warden/pull/196)
- Add agent discovery alongside skills by @dcramer in [#136](https://github.com/getsentry/warden/pull/136)

#### Sweep

- Add --skill flag to scan.py by @dcramer in [#211](https://github.com/getsentry/warden/pull/211)
- Add master tracking issue for sweep PRs by @dcramer in [#210](https://github.com/getsentry/warden/pull/210)

#### Telemetry

- Add skill and model attribution to metrics by @gricha in [#231](https://github.com/getsentry/warden/pull/231)
- Add namespaced fix-eval feedback metrics by @dcramer in [#229](https://github.com/getsentry/warden/pull/229)
- Add global scope attributes, run metric, and trace ID surfacing by @dcramer in [#166](https://github.com/getsentry/warden/pull/166)
- Add input/output attributes to gen_ai spans by @dcramer in [#142](https://github.com/getsentry/warden/pull/142)
- Add per-turn tracing for Claude Code SDK agent calls by @dcramer in [#141](https://github.com/getsentry/warden/pull/141)

#### Other

- (action) Write structured findings JSON and expose as output by @gricha in [#233](https://github.com/getsentry/warden/pull/233)
- (config) Make auxiliary max retries configurable via defaults.auxiliaryMaxRetries by @dcramer in [#175](https://github.com/getsentry/warden/pull/175)
- (dedup) Add intra-batch finding consolidation by @dcramer in [#135](https://github.com/getsentry/warden/pull/135)
- (init) Add section-based output and interactive skill prompt by @dcramer in [#182](https://github.com/getsentry/warden/pull/182)
- (o11y) Capture run failures in JSONL output by @dcramer in [#259](https://github.com/getsentry/warden/pull/259)
- (output) Default to COMMENT instead of REQUEST_CHANGES on PRs by @dcramer in [#137](https://github.com/getsentry/warden/pull/137)
- (runner) Global concurrency pool for file analyses by @dcramer in [#158](https://github.com/getsentry/warden/pull/158)
- (runs) Stream in-progress runs via 'warden runs follow' by @dcramer in [#261](https://github.com/getsentry/warden/pull/261)
- (sdk) Store Claude SDK sessions in .warden/sessions/ by @dcramer in [#193](https://github.com/getsentry/warden/pull/193)
- Add verification field and confidence filtering by @dcramer in [#191](https://github.com/getsentry/warden/pull/191)
- Pnpm workspace monorepo with docs migration by @dcramer in [#185](https://github.com/getsentry/warden/pull/185)
- Adopt dotagents for skill management by @dcramer in [#168](https://github.com/getsentry/warden/pull/168)
- Cross-location finding merge by @dcramer in [#148](https://github.com/getsentry/warden/pull/148)
- Add env vars to generated workflow and docs by @dcramer in [#138](https://github.com/getsentry/warden/pull/138)
- Add Sentry observability (errors, tracing, metrics, structured logs) by @dcramer in [#133](https://github.com/getsentry/warden/pull/133)
- Split failOn into independent requestChanges and failCheck controls by @dcramer in [#129](https://github.com/getsentry/warden/pull/129)

### Bug Fixes 🐛

#### Action

- Handle missing warden.toml gracefully by @gricha in [#235](https://github.com/getsentry/warden/pull/235)
- Thread maxContextFiles config through Action workflows by @dcramer in [#216](https://github.com/getsentry/warden/pull/216)

#### Cli

- Replace process.exit(130) with thrown error for graceful cleanup by @dcramer in [#213](https://github.com/getsentry/warden/pull/213)
- Write --output file on auth error early exit by @dcramer in [#214](https://github.com/getsentry/warden/pull/214)
- Normalize path separators in synthetic file changes by @dcramer in [#217](https://github.com/getsentry/warden/pull/217)
- Exclude node_modules from gitignore file discovery by @dcramer in [#220](https://github.com/getsentry/warden/pull/220)
- Collapse skipped files into a single count on Ctrl+C by @dcramer in [#172](https://github.com/getsentry/warden/pull/172)
- Render warnings through Ink's Static component by @dcramer in [#170](https://github.com/getsentry/warden/pull/170)
- Cap 'Other Files' list in prompts for CLI mode by @dcramer in [#171](https://github.com/getsentry/warden/pull/171)
- Move completed files to Static to prevent flickering by @dcramer in [#149](https://github.com/getsentry/warden/pull/149)
- Run all skills locally regardless of trigger type by @gricha in [#145](https://github.com/getsentry/warden/pull/145)
- Resolve remote config for --skill flag by @dcramer in [#130](https://github.com/getsentry/warden/pull/130)

#### Output

- List only successfully applied fixes in PR body by @dcramer in [#219](https://github.com/getsentry/warden/pull/219)
- Use backticks instead of brackets in attribution footer by @dcramer in [#197](https://github.com/getsentry/warden/pull/197)

#### Sdk

- Strip invalid suggested fixes from reports by @dcramer in [#228](https://github.com/getsentry/warden/pull/228)
- Prevent Warden sessions from polluting Claude Code history by @dcramer in [#202](https://github.com/getsentry/warden/pull/202)
- Handle EPIPE errors from Claude subprocess failures by @dcramer in [#198](https://github.com/getsentry/warden/pull/198)
- Add verification checklist and Glob tool to reduce analysis hallucinations by @dcramer in [#173](https://github.com/getsentry/warden/pull/173)
- Constrain skill findings to diff hunk line range by @dcramer in [#151](https://github.com/getsentry/warden/pull/151)

#### Sweep

- Add self-validation to fix subagent prompt by @dcramer in [#223](https://github.com/getsentry/warden/pull/223)
- Branch worktrees from default branch instead of HEAD by @dcramer in [#221](https://github.com/getsentry/warden/pull/221)

#### Telemetry

- Improve OTel GenAI semantic convention compliance by @dcramer in [#140](https://github.com/getsentry/warden/pull/140)
- Fix missing Sentry traces and negative token costs by @dcramer in [#139](https://github.com/getsentry/warden/pull/139)

#### Other

- (ci) Enable auto-generated changelogs for GitHub releases by @gricha in [#234](https://github.com/getsentry/warden/pull/234)
- (config) Add missing fields to TOML writer for config round-trip by @dcramer in [#218](https://github.com/getsentry/warden/pull/218)
- (evals) Update default model to claude-sonnet-4-6 by @dcramer in [#163](https://github.com/getsentry/warden/pull/163)
- (o11y) Add gen_ai.request.model attribute by @obostjancic in [#247](https://github.com/getsentry/warden/pull/247)
- (prepare) Skip files with zero content automatically by @dcramer in [#226](https://github.com/getsentry/warden/pull/226)
- (skills) Support private repos in `warden add --remote` by @dcramer in [#187](https://github.com/getsentry/warden/pull/187)
- (usage) Normalize inputTokens to include cached and cache-write tokens by @vgrozdanic in [#143](https://github.com/getsentry/warden/pull/143)
- Handle multi-line YAML scalar values in SKILL.md frontmatter by @odysseus0 in [#243](https://github.com/getsentry/warden/pull/243)
- Server error handler calls process.exit() bypassing cleanup by @dcramer in [#206](https://github.com/getsentry/warden/pull/206)
- Preserve error chains across error wrapping boundaries by @dcramer in [#215](https://github.com/getsentry/warden/pull/215)
- Respect ignorePaths in all code paths by @dcramer in [#204](https://github.com/getsentry/warden/pull/204)
- Exclude dev files and secrets from npm package by @dcramer in [#186](https://github.com/getsentry/warden/pull/186)
- Clean up orphaned Warden comments when no triggers match by @dcramer in [#134](https://github.com/getsentry/warden/pull/134)
- Show findings in PR review body when inline comments fail by @dcramer in [#128](https://github.com/getsentry/warden/pull/128)
- Show skipped status for files not processed during Ctrl+C by @dcramer in [#127](https://github.com/getsentry/warden/pull/127)

### Documentation 📚

- (homepage) Redesign to lead with skills by @dcramer in [#238](https://github.com/getsentry/warden/pull/238)
- Lead homepage with GitHub PR review story by @dcramer in [#240](https://github.com/getsentry/warden/pull/240)
- Add org-wide GitHub setup guide by @dcramer in [#239](https://github.com/getsentry/warden/pull/239)
- Replace non-existent skill names with generic placeholders by @dcramer in [#199](https://github.com/getsentry/warden/pull/199)
- Simplify getting started guide to use native warden add --remote by @dcramer in [#164](https://github.com/getsentry/warden/pull/164)
- Fix documentation inconsistencies with codebase by @dcramer in [#147](https://github.com/getsentry/warden/pull/147)
- Update config reference with missing fields by @dcramer in [#132](https://github.com/getsentry/warden/pull/132)

### Internal Changes 🔧

- (agents) Update configured skills list by @dcramer in [#241](https://github.com/getsentry/warden/pull/241)
- (cli) Use git ls-files for .gitignore discovery by @dcramer in [#222](https://github.com/getsentry/warden/pull/222)
- (config) Exclude evals directory from warden analysis by @dcramer in [#203](https://github.com/getsentry/warden/pull/203)
- (deps) Bump yaml from 2.8.2 to 2.8.3 by @dependabot in [#254](https://github.com/getsentry/warden/pull/254)
- (dotagents) Gitignore auto-generated files instead of tracking them by @gricha in [#246](https://github.com/getsentry/warden/pull/246)
- (output) Clean up GitHub finding rendering by @dcramer in [#176](https://github.com/getsentry/warden/pull/176)
- (sdk) Extract applyMergeGroups to unify cross-location merge logic by @dcramer in [#153](https://github.com/getsentry/warden/pull/153)
- (sweep) Clean up warden-sweep skill per skill-creator review by @dcramer in [#225](https://github.com/getsentry/warden/pull/225)
- Add .serena to gitignore by @ericapisani in [#180](https://github.com/getsentry/warden/pull/180)
- Extract shared skill selection and validate setup-app args by @dcramer in [#208](https://github.com/getsentry/warden/pull/208)
- Combine multiple reduce operations into single pass by @dcramer in [#207](https://github.com/getsentry/warden/pull/207)
- Simplify repetitive column width calculations in logs by @dcramer in [#209](https://github.com/getsentry/warden/pull/209)
- Collapse severity to 3 levels, add warden logs command by @dcramer in [#192](https://github.com/getsentry/warden/pull/192)
- Migrate to dotagents and add skills reference to AGENTS.md by @dcramer in [#195](https://github.com/getsentry/warden/pull/195)
- Tighten weak mock assertions in test suite by @dcramer in [#160](https://github.com/getsentry/warden/pull/160)
- Add conductor.json configuration by @dcramer in [#159](https://github.com/getsentry/warden/pull/159)
- Remove generated artifacts from dist, keep only ncc bundle by @dcramer in [#131](https://github.com/getsentry/warden/pull/131)
- Replace batch-based concurrency with sliding window pool by @dcramer in [#126](https://github.com/getsentry/warden/pull/126)

### Other

- Docs UI improvements by @PickleNik in [#248](https://github.com/getsentry/warden/pull/248)
- release: 0.20.0 by @getsentry-bot in [e7dbd6eb](https://github.com/getsentry/warden/commit/e7dbd6eb1680d1d15df6388084237e5d231ec929)
- release: 0.19.0 by @getsentry-bot in [0096b702](https://github.com/getsentry/warden/commit/0096b7024749edf9e62a791340cfea2ef5b899bf)
- chores(docs): Add instruction for creating org rulesets by @Jeffreyhung in [#244](https://github.com/getsentry/warden/pull/244)
- release: 0.18.0 by @getsentry-bot in [e3691621](https://github.com/getsentry/warden/commit/e3691621d9f92de1f47fadb47be162b90f7042ff)
- release: 0.17.0 by @getsentry-bot in [d6132a96](https://github.com/getsentry/warden/commit/d6132a960cb033ec737042bea68f195b5cadef76)
- release: 0.16.0 by @getsentry-bot in [62909fe4](https://github.com/getsentry/warden/commit/62909fe4d28c322508945382d001d0a6844852f2)
- release: 0.15.0 by @getsentry-bot in [d9905cee](https://github.com/getsentry/warden/commit/d9905ceee868cba2aa41f8f17233eacb44901c36)
- release: 0.14.0 by @getsentry-bot in [538f13b4](https://github.com/getsentry/warden/commit/538f13b44a4e78f30ecc668957f6cede7d8e7161)
- release: 0.13.0 by @getsentry-bot in [063517a9](https://github.com/getsentry/warden/commit/063517a90a903b56919eec66542b129950ff866c)
- release: 0.12.0 by @getsentry-bot in [7177c99f](https://github.com/getsentry/warden/commit/7177c99fb10de1cbec8b788881d501a4f8d72965)
- Remove outdated SPEC.md by @dcramer in [#181](https://github.com/getsentry/warden/pull/181)
- release: 0.11.0 by @getsentry-bot in [b5525e63](https://github.com/getsentry/warden/commit/b5525e6332a7090940f066b676ea4cf587aa1e2a)
- release: 0.10.0 by @getsentry-bot in [5762bc7a](https://github.com/getsentry/warden/commit/5762bc7a0b608cdbe31db7b740e8eeff21da2081)
- Add repository and source context to skill metrics by @dcramer in [#165](https://github.com/getsentry/warden/pull/165)
- Add end-to-end eval system with LLM judge by @dcramer in [#152](https://github.com/getsentry/warden/pull/152)
- release: 0.9.0 by @getsentry-bot in [d36b060f](https://github.com/getsentry/warden/commit/d36b060f650314a1dfafa78a1801be980272e3c0)
- release: 0.8.0 by @getsentry-bot in [7f71a98d](https://github.com/getsentry/warden/commit/7f71a98d931a128ba936df2ff5b73a72a987e6ab)
- release: 0.7.0 by @getsentry-bot in [b6e61976](https://github.com/getsentry/warden/commit/b6e6197647e44211f5d1a30788d0c6792e24c97a)
- Remove dist/action from main, build at release time by @dcramer in [#101](https://github.com/getsentry/warden/pull/101)

