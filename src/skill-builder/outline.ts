import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import type { Runtime, RuntimeName } from '../sdk/runtimes/index.js';
import { getRuntime } from '../sdk/runtimes/index.js';
import { runStructuredSkillBuilderAgent, StructuredSkillBuilderAgentError } from './agentic.js';
import {
  GENERATED_SKILL_DEFINITION_FILE,
  loadGeneratedSkillDefinition,
} from './definition.js';
import {
  outlineHash,
  SKILL_BUILD_OUTLINE_SCHEMA_VERSION,
  SKILL_BUILD_VERSION,
  SkillBuildOutlineSchema,
  type SkillBuildOutline,
  type SkillBuildOutlineResult,
  type SkillBuildSourceFile,
  type SkillBuildSource,
} from './outline-contract.js';
import {
  getBuildStatePath,
  type SkillBuildState,
  readSkillBuildState,
  SKILL_BUILD_STATE_KIND,
  SKILL_BUILD_STATE_SCHEMA_VERSION,
  writeSkillBuildState,
} from './outline-state.js';

export { outlineHash, SKILL_BUILD_OUTLINE_SCHEMA_VERSION, SKILL_BUILD_VERSION, SkillBuildOutlineSchema } from './outline-contract.js';
export type { SkillBuildOutline, SkillBuildOutlineResult, SkillBuildSource, SkillBuildSourceFile } from './outline-contract.js';

export const SKILL_BUILD_MAX_TOKENS = 64_000;
export const SKILL_BUILD_TIMEOUT_MS = 180_000;
export const SKILL_BUILD_MAX_TURNS = 80;

export interface BuildSkillOutlineOptions {
  skill: SkillDefinition;
  runtime?: Runtime;
  runtimeName?: RuntimeName;
  apiKey?: string;
  model?: string;
  previousOutline?: SkillBuildOutline;
  maxRetries?: number;
  regenerate?: boolean;
  abortController?: AbortController;
  repoPath?: string;
  maxTurns?: number;
  repairModel?: string;
  repairMaxRetries?: number;
  onStatus?: (message: string) => void;
}

export class SkillBuildOutlineError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillBuildOutlineError';
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sourceBlocks(source: SkillBuildSource): string {
  return source.files
    .map((file) => `## ${file.path}\n\n${file.content}`)
    .join('\n\n---\n\n');
}

export function collectSkillBuildSource(skill: SkillDefinition): SkillBuildSource {
  const files: SkillBuildSourceFile[] = [];

  if (skill.rootDir) {
    const { content } = loadGeneratedSkillDefinition(skill.rootDir);
    files.push({ path: GENERATED_SKILL_DEFINITION_FILE, content });
  } else {
    files.push({
      path: GENERATED_SKILL_DEFINITION_FILE,
      content: `version: 1\nkind: generated-skill\nname: ${skill.name}\nprompt: ${JSON.stringify(skill.prompt)}\n`,
    });
  }

  const hash = sha256(JSON.stringify({
    skill: skill.name,
    files,
  }));

  return { hash, files };
}

function validateOutlineIdentity(outline: SkillBuildOutline, skillName: string, sourceHash: string): void {
  if (outline.skill !== skillName) {
    throw new SkillBuildOutlineError(
      `Generated skill outline mismatch: expected ${skillName}, got ${outline.skill}`,
    );
  }
  if (outline.sourceHash !== sourceHash) {
    throw new SkillBuildOutlineError(
      `Generated skill outline source hash mismatch for ${skillName}. Regenerate the skill.`,
    );
  }
  if (outline.buildVersion !== SKILL_BUILD_VERSION) {
    throw new SkillBuildOutlineError(
      `Generated skill outline version mismatch for ${skillName}. Regenerate the skill.`,
    );
  }
}

function validateStateIdentity(state: SkillBuildState, model: string | undefined): void {
  if (state.identity?.requestedModel !== model) {
    throw new SkillBuildOutlineError(
      `Generated skill model mismatch. Expected ${model ?? 'default'}, got ${state.identity?.requestedModel ?? 'default'}. Regenerate the skill.`,
    );
  }
}

function renderPreviousOutlineContinuity(previousOutline: SkillBuildOutline | undefined): string {
  if (!previousOutline || previousOutline.tracks.length === 0) {
    return '';
  }

  const previousTracks = previousOutline.tracks.map((track) => ({
    id: track.id,
    title: track.title,
    goal: track.goal,
  }));

  return `

Existing track continuity:
- Reuse an existing track id exactly when the same concern still exists after regeneration.
- Only create a new track id when a concern is genuinely new.
- If one previous track splits into multiple tracks, keep the previous id on the primary surviving concern and mint new ids only for the new sibling concerns.
- If multiple previous tracks merge, keep the id of the track whose concern remains primary.
- Do not rename tracks casually. Stable ids help compare authoring plans across regenerations.

Previous track set:
${JSON.stringify(previousTracks, null, 2)}`;
}

function buildOutlinePrompt(
  skill: SkillDefinition,
  source: SkillBuildSource,
  previousOutline?: SkillBuildOutline,
): string {
  return `You build the internal outline for one repo-local Warden skill.

This outline exists only to give Warden context for a later authoring-provider run. It is planning metadata, not a runnable skill, and it does not prescribe the final artifact layout.

Rules:
- Return only a JSON object. No markdown, prose, or code fences.
- Use version ${SKILL_BUILD_OUTLINE_SCHEMA_VERSION}.
- Use skill "${skill.name}".
- Use sourceHash "${source.hash}" exactly.
- Use buildVersion "${SKILL_BUILD_VERSION}" exactly.
- First determine what kind of skill this is: domain, ecosystem, repository, or product.
- First determine the full agenda implied by the prompt, metadata contract, and source material. The track set exists only to accomplish that agenda completely.
- Split by analysis concern, not file type, severity, or implementation phase.
- Track count is unconstrained. Use as many or as few tracks as needed to fit the agenda cleanly.
- If one track can carry the agenda without becoming vague or overloaded, one track is correct.
- If the agenda requires many focused tracks to avoid overlap or shallow work, many tracks are correct.
- The important constraint is scope fit: each track should be small enough to support deep, coherent execution, and the full track set should accomplish the entire agenda without gaps or duplicate ownership.
- Each track must have an id, title, goal, rationale, sourceSignals, owns, excludes, relevanceSignals, evidenceFocus, checks, safeCounterpatterns, falsePositiveTraps, and researchHints.
- Track ids must be lowercase kebab-case.
- The outline should stay lean. Do not write runnable prompts here.
- scopeProfile.subject should describe the generated skill, not the repo name alone.
- scopeProfile.observedContext should capture the concrete context that shaped the track split:
  - for repository or product skills, include the stack, runtime, notable trust boundaries, and important repo-local surfaces you actually observed
  - for domain or ecosystem skills, include the supplied source material, intended platform, and any explicit coverage boundaries
- scopeProfile.unresolvedContext is only for context that would materially improve decomposition and was not inferable from the provided sources.
- Do not list obvious context as unresolved when it is already visible in the source material.
- Treat each track as a concise analysis concern that the authoring provider may use, merge, split, or inline while producing the final skill:
  - goal: the one-line investigation objective
  - rationale: why this track exists for this skill
  - sourceSignals: the context signals that justified this track
  - owns: the primary concerns this track is responsible for
  - excludes: the sibling concerns or boundaries this track must not absorb
  - relevanceSignals: the file, hunk, or behavioral cues that should make the runtime skill pick this track
  - evidenceFocus: what concrete evidence the runtime skill must require
  - checks: a short ordered task set of concrete investigation steps or questions for this track
  - safeCounterpatterns: concrete safe patterns, mitigations, or boundary conditions that should suppress weak findings
  - falsePositiveTraps: the common shallow misreads, sibling overlaps, or pattern-only claims that this track must avoid
  - researchHints: public docs, runtime topics, or prior-art areas the generated reference may need to consult
- Keep track fields short and specific. If a field starts reading like a long prompt, you are adding bloat to the outline.
- Do not put trigger-language, long remediation playbooks, or essay-length false-positive controls into the outline.
- When one code path could create chained risks across tracks, assign one primary owning track and make the other tracks exclude that ownership boundary instead of competing for the same finding.
- Boundary rules should be written from this track's perspective: say what this track owns and what it must not report.
- If the source material is too thin for a safe decomposition, make that explicit inside scopeProfile.unresolvedContext or the relevant track fields. Do not silently invent coverage areas.
- Do not ask follow-up questions or return prose. If context is missing, still return valid JSON and record it in scopeProfile.unresolvedContext or the relevant track fields.
- Keep all track guidance compatible with Warden's normal hunk analysis model: concerns must be focused, inspectable, and able to return an empty findings array when evidence is insufficient.
- If the skill is intentionally generic, keep it generic. Depth must come from concrete checks, relevance signals, safe counterpatterns, falsePositiveTraps, and researchHints, not fake repo specificity.

JSON shape:
{
  "version": ${SKILL_BUILD_OUTLINE_SCHEMA_VERSION},
  "skill": "${skill.name}",
  "sourceHash": "${source.hash}",
  "buildVersion": "${SKILL_BUILD_VERSION}",
  "scopeProfile": {
    "kind": "repository",
    "subject": "Security review for this repo's CLI and runtime surfaces",
    "localContextUsed": true,
    "observedContext": [
      "Node.js and TypeScript runtime",
      "CLI orchestration and subprocess execution",
      "GitHub workflow and token boundaries"
    ],
    "unresolvedContext": ["Production deployment boundary, if it materially affects decomposition"]
  },
  "build": {
    "phases": [
      {"id": "collect-inputs", "status": "generated"},
      {"id": "assess-source-depth", "status": "generated"},
      {"id": "identify-research-needs", "status": "generated"},
      {"id": "build-tracks", "status": "generated"},
      {"id": "validate-coverage", "status": "validated"}
    ],
    "externalSources": [
      {"title": "Public source title", "url": "https://example.com/source", "reason": "Why this source informed the decomposition"}
    ]
  },
  "tracks": [
    {
      "id": "example-track",
      "title": "Example track",
      "goal": "One-line investigation objective.",
      "rationale": "Why this track exists for this skill.",
      "sourceSignals": ["Observed context or source signal that justified this track"],
      "owns": ["Primary concern this track is responsible for"],
      "excludes": ["Sibling concern or boundary this track must not report"],
      "relevanceSignals": ["Cue that should make the runtime skill choose this track"],
      "evidenceFocus": ["Concrete evidence the runtime skill must require"],
      "checks": ["Ordered investigation step or question for this track"],
      "safeCounterpatterns": ["Concrete safe pattern or mitigation that should suppress weak reporting"],
      "falsePositiveTraps": ["Common shallow misread or sibling overlap this track must avoid"],
      "researchHints": ["Public runtime or ecosystem topic the generated reference may need to consult"]
    }
  ]
}

Quality bar:
- The outline should fully accomplish the agenda implied by the prompt, metadata, and source material. Do not optimize for a preferred number of tracks.
- The track set should be specific enough that one generated skill can route work clearly and avoid duplicate reports.
- Each track should have the right amount of work for one coherent investigation track: not so broad that it becomes shallow, and not so narrow that the split becomes busywork.
- The checks should be specific enough that the authoring provider can turn them into executable runtime guidance without inventing the structure again.
- The track set should give later build steps enough depth hooks to expand into strong references: relevanceSignals, safeCounterpatterns, falsePositiveTraps, and researchHints should be concrete instead of generic filler.
- Repository or product skills must reflect the local context actually observed. Domain or ecosystem skills must say they are generic and stay aligned with the supplied scope.

Skill description:
${skill.description}
${renderPreviousOutlineContinuity(previousOutline)}

Source material:

${sourceBlocks(source)}`;
}

function buildOutlineSystemPrompt(): string {
  return `You build the internal outline for one generated Warden skill.

Use Read, Grep, and Glob to inspect relevant repository source before deciding how to decompose the skill when local context is needed. Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the outline.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

Return only the strict JSON object requested by the user prompt. Never return prose or follow-up questions.`;
}

function parseCachedOutline(
  statePath: string,
  skillName: string,
  sourceHash: string,
  model?: string,
): SkillBuildState | undefined {
  const state = readSkillBuildState(statePath);
  if (!state) {
    return undefined;
  }

  try {
    validateOutlineIdentity(state.outline, skillName, sourceHash);
    validateStateIdentity(state, model);
    return state;
  } catch {
    return undefined;
  }
}

export async function buildSkillOutline(
  options: BuildSkillOutlineOptions,
): Promise<SkillBuildOutlineResult> {
  const { skill, apiKey, model, maxRetries, regenerate = false } = options;
  const runtime = options.runtime ?? getRuntime(options.runtimeName ?? 'claude');
  const source = collectSkillBuildSource(skill);
  const rootDir = skill.rootDir;
  if (!rootDir) {
    throw new SkillBuildOutlineError(`Generated skill ${skill.name} is missing a root directory`);
  }

  const statePath = getBuildStatePath(rootDir);
  if (existsSync(statePath) && !regenerate) {
    const state = parseCachedOutline(statePath, skill.name, source.hash, model);
    if (state) {
      return {
        outline: state.outline,
        source: 'cache',
        statePath,
        usage: state.outlineRun?.usage,
        durationMs: state.outlineRun?.durationMs,
        responseModel: state.outlineRun?.responseModel,
        numTurns: state.outlineRun?.numTurns,
      };
    }
  }

  if (options.repoPath) {
    try {
      options.onStatus?.('Inspecting source material');
      const result = await runStructuredSkillBuilderAgent({
        runtime,
        repoPath: options.repoPath,
        skillName: `${skill.name}:skill-outline`,
        systemPrompt: buildOutlineSystemPrompt(),
        userPrompt: buildOutlinePrompt(skill, source, options.previousOutline),
        schema: SkillBuildOutlineSchema,
        model,
        maxTurns: options.maxTurns ?? SKILL_BUILD_MAX_TURNS,
        abortController: options.abortController,
        repair: {
          apiKey,
          model: options.repairModel,
          maxRetries: options.repairMaxRetries ?? maxRetries,
        },
      });

      validateOutlineIdentity(result.data, skill.name, source.hash);
      writeSkillBuildState(statePath, {
        version: SKILL_BUILD_STATE_SCHEMA_VERSION,
        kind: SKILL_BUILD_STATE_KIND,
        identity: model ? { requestedModel: model } : undefined,
        outline: result.data,
        outlineRun: {
          usage: result.usage,
          durationMs: result.durationMs,
          responseModel: result.responseModel,
          numTurns: result.numTurns,
        },
        updatedAt: new Date().toISOString(),
      });

      return {
        outline: result.data,
        source: 'generated',
        statePath,
        usage: result.usage,
        durationMs: result.durationMs,
        responseModel: result.responseModel,
        numTurns: result.numTurns,
      };
    } catch (error) {
      if (error instanceof StructuredSkillBuilderAgentError) {
        throw new SkillBuildOutlineError(`Skill outline build failed: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  const result = await runtime.runSynthesis({
    task: 'skill_build',
    apiKey,
    prompt: buildOutlinePrompt(skill, source, options.previousOutline),
    schema: SkillBuildOutlineSchema,
    model,
    maxTokens: SKILL_BUILD_MAX_TOKENS,
    timeout: SKILL_BUILD_TIMEOUT_MS,
    maxRetries,
  });

  if (!result.success) {
    throw new SkillBuildOutlineError(`Skill outline build failed: ${result.error}`);
  }

  validateOutlineIdentity(result.data, skill.name, source.hash);
  writeSkillBuildState(statePath, {
    version: SKILL_BUILD_STATE_SCHEMA_VERSION,
    kind: SKILL_BUILD_STATE_KIND,
    identity: model ? { requestedModel: model } : undefined,
    outline: result.data,
    outlineRun: {
      usage: result.usage,
    },
    updatedAt: new Date().toISOString(),
  });

  return {
    outline: result.data,
    source: 'generated',
    statePath,
    usage: result.usage,
  };
}

export function defaultOutlineExportPath(skillName: string): string {
  return `${basename(skillName)}-outline.json`;
}
