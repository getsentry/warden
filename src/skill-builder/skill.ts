import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { aggregateUsage } from '../sdk/usage.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import { runStructuredSkillBuilderAgent, StructuredSkillBuilderAgentError } from './agentic.js';
import type { UsageStats } from '../types/index.js';
import { clearGeneratedSkillArtifacts } from './definition.js';
import { resolveAuthoringProvider } from './authoring-provider.js';
import {
  type SkillBuildOutline,
  type SkillBuildSource,
  outlineHash,
} from './outline-contract.js';
import {
  getBuildStatePath,
  readSkillBuildState,
  writeSkillBuildState,
} from './outline-state.js';
import {
  GeneratedSkillAuthoringPlanSchema,
  GeneratedSkillBuildError,
  GeneratedSkillContributionSchema,
  GeneratedSkillFileMapSchema,
  GeneratedSkillReviewResultSchema,
  type GeneratedSkillArtifact,
  type GeneratedSkillContribution,
  type GeneratedSkillFileMap,
  type GeneratedSkillReviewResult,
  type SkillBuildAuthoringProvider,
} from './skill-contract.js';
export { GeneratedSkillBuildError } from './skill-contract.js';
import {
  authoringSystemPrompt,
  buildAuthoringImplementationPrompt,
  buildAuthoringPlanPrompt,
  buildAuthoringRevisionPrompt,
  buildAuthoringTrackContributionPrompt,
  buildAuthoringValidationPrompt,
  defaultBuildMaxTurns,
  defaultValidationMaxTurns,
} from './skill-prompts.js';

const GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION = 4;
const LONG_REFERENCE_LINE_LIMIT = 100;
const MAX_SKILL_REVISION_ATTEMPTS = 1;
const SKILL_FRONTMATTER_PATTERN = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
type GeneratedSkillReviewIssue = GeneratedSkillReviewResult['issues'][number];

interface SkillBuilderStepMetrics {
  usage: UsageStats;
  responseModel?: string;
  numTurns?: number;
}

interface SkillBuilderReviewResult extends SkillBuilderStepMetrics {
  data: GeneratedSkillReviewResult;
}

function artifactFiles(rootDir: string): {
  path: string;
  content: string;
  bytes: number;
}[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: {
    path: string;
    content: string;
    bytes: number;
  }[] = [];

  function visit(relativeDir: string): void {
    for (const entry of readdirSync(join(rootDir, relativeDir), { withFileTypes: true })) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.name === 'warden.yaml' || entry.name === 'build-state.json') {
        continue;
      }
      if (entry.isDirectory()) {
        visit(relativePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const content = readFileSync(join(rootDir, relativePath), 'utf-8');
      files.push({
        path: relativePath,
        content,
        bytes: Buffer.byteLength(content, 'utf-8'),
      });
    }
  }

  visit('');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function filesByteLength(files: { content: string }[]): number {
  return files.reduce((sum, file) => sum + Buffer.byteLength(file.content, 'utf-8'), 0);
}

function fileManifest(files: { path: string; content: string }[]): {
  path: string;
  bytes: number;
}[] {
  return files.map((file) => ({
    path: file.path,
    bytes: Buffer.byteLength(file.content, 'utf-8'),
  })).sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeFileContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
}

function canonicalGeneratedArtifactPath(path: string): string {
  if (path.startsWith('references/tracks/')) {
    return `references/${path.slice('references/tracks/'.length)}`;
  }
  return path;
}

function rewriteGeneratedArtifactPathReferences(content: string, pathMap: Map<string, string>): string {
  let rewritten = content;
  const entries = [...pathMap.entries()]
    .filter(([from, to]) => from !== to)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    rewritten = rewritten.split(from).join(to);
  }
  return rewritten;
}

function canonicalizeGeneratedFileMapPaths(fileMap: GeneratedSkillFileMap): GeneratedSkillFileMap {
  const pathMap = new Map<string, string>();
  const changedPaths: [string, string][] = [];
  for (const file of fileMap.files) {
    const canonicalPath = canonicalGeneratedArtifactPath(file.path);
    pathMap.set(file.path, canonicalPath);
    if (file.path !== canonicalPath) {
      changedPaths.push([file.path, canonicalPath]);
    }
    if (canonicalPath.startsWith('references/')) {
      pathMap.set(`references/tracks/${canonicalPath.slice('references/'.length)}`, canonicalPath);
    }
  }

  const files = new Map<string, {
    path: string;
    content: string;
  }>();
  let contentChanged = false;
  for (const file of fileMap.files) {
    const path = pathMap.get(file.path) ?? file.path;
    const content = rewriteGeneratedArtifactPathReferences(file.content, pathMap);
    contentChanged ||= content !== file.content;
    const existing = files.get(path);
    if (!existing || content.length > existing.content.length) {
      files.set(path, { path, content });
    }
  }

  if (changedPaths.length === 0 && !contentChanged) {
    return fileMap;
  }

  const validationNotes = [...fileMap.validationNotes];
  if (changedPaths.length > 0) {
    validationNotes.push(
      `Flattened generated reference path(s): ${changedPaths
        .map(([from, to]) => `${from} -> ${to}`)
        .sort()
        .join(', ')}`,
    );
  }

  return {
    ...fileMap,
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
    validationNotes,
  };
}

function skillFrontmatter(content: string): Record<string, unknown> | undefined {
  const match = content.match(SKILL_FRONTMATTER_PATTERN);
  const frontmatter = match?.[1];
  if (!frontmatter) {
    return undefined;
  }
  try {
    const parsed = parseYaml(frontmatter);
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function targetSubject(targetName: string): string {
  return targetName
    .replace(/^wrdn-/, '')
    .replace(/[-_]+/g, ' ')
    .trim() || targetName;
}

function isAuthoringMetadataDescription(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return (
    /\b(SKILL\.md|SPEC\.md|SOURCES\.md|reference-backed|focused references?)\b/i.test(normalized) ||
    (
      /^generated\b/i.test(normalized) &&
      /\b(skill|architecture|router|references?|wrdn-[a-z0-9-]+)\b/i.test(normalized)
    )
  );
}

function containsAuthoringMetadata(content: string): boolean {
  return /^##\s+(Future Research Needs|Validation Sources|Authoring Decisions)\b/im.test(content) ||
    /\b(internal outline|build pipeline|build phases|source collection|scope profiling|track identification|coverage validation|authoring decisions|no external research performed)\b/i.test(content);
}

function containsOutputContract(content: string): boolean {
  return /^##\s+(Output Format|Output Contract|Response Format|Report Format)\b/im.test(content) ||
    /\bWarden'?s JSON finding schema\b/i.test(content);
}

function stripOutputContractSections(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const kept: string[] = [];
  let skippingUntilLevel: number | undefined;

  for (const line of lines) {
    const heading = /^(#{2,6})\s+(Output Format|Output Contract|Response Format|Report Format)\b/i.exec(line);
    const anyHeading = /^(#{1,6})\s+\S/.exec(line);
    const headingMarker = heading?.[1];
    const anyHeadingMarker = anyHeading?.[1];
    if (headingMarker) {
      skippingUntilLevel = headingMarker.length;
      continue;
    }
    if (skippingUntilLevel !== undefined) {
      if (anyHeadingMarker && anyHeadingMarker.length <= skippingUntilLevel) {
        skippingUntilLevel = undefined;
      } else {
        continue;
      }
    }
    kept.push(line);
  }

  return kept.join('\n').trimEnd();
}

function stripUnavailableArtifactReferences(content: string, availablePaths: Set<string>): string {
  const missingPaths = referencedArtifactPaths(content)
    .filter((path) => !availablePaths.has(path));
  if (missingPaths.length === 0) {
    return content;
  }
  const stripped = content.replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !missingPaths.some((path) => line.includes(path)))
    .join('\n');
  return stripped.replace(/\n{3,}/g, '\n\n').trimEnd();
}

function documentsExternalSources(fileMap: GeneratedSkillFileMap, content: string): boolean {
  return fileMap.externalSources.some((source) =>
    content.includes(source.title) || content.includes(source.url)
  );
}

function shouldOmitGeneratedArtifact(fileMap: GeneratedSkillFileMap, file: {
  path: string;
  content: string;
}): boolean {
  if (file.path === 'SOURCES.md') {
    if (fileMap.externalSources.length === 0) {
      return true;
    }
    return containsAuthoringMetadata(file.content) &&
      !documentsExternalSources(fileMap, file.content);
  }
  if (
    file.path === 'SPEC.md' &&
    (containsOutputContract(file.content) || containsAuthoringMetadata(file.content))
  ) {
    return true;
  }
  return false;
}

function fallbackDescription(fileMap: GeneratedSkillFileMap, targetName: string): string {
  const summary = fileMap.summary.replace(/\s+/g, ' ').trim();
  if (summary && !isAuthoringMetadataDescription(summary)) {
    return summary;
  }
  return `Use when reviewing code changes for ${targetSubject(targetName)} concerns.`;
}

function ensureSkillFrontmatter(args: {
  content: string;
  fileMap: GeneratedSkillFileMap;
  targetName: string;
}): string {
  const frontmatter = skillFrontmatter(args.content);
  const description = frontmatter?.['description'];
  if (
    frontmatter?.['name'] === args.targetName &&
    typeof description === 'string' &&
    description.trim() &&
    !isAuthoringMetadataDescription(description)
  ) {
    return args.content;
  }
  const body = args.content.replace(SKILL_FRONTMATTER_PATTERN, '').trimStart();
  const preserved = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
  const repairedFrontmatter = stringifyYaml({
    name: args.targetName,
    description: fallbackDescription(args.fileMap, args.targetName),
    ...Object.fromEntries(
      Object.entries(preserved).filter(([key]) => key !== 'name' && key !== 'description'),
    ),
  }).trimEnd();
  return `---
${repairedFrontmatter}
---

${body}`;
}

function referencedSkillPaths(content: string): string[] {
  const paths = new Set<string>();
  for (const match of content.matchAll(/references\/[a-zA-Z0-9][a-zA-Z0-9._/-]*/g)) {
    const path = match[0].replace(/[.,;:!?]+$/g, '');
    if (/[a-zA-Z0-9]$/.test(path)) {
      paths.add(path);
    }
  }
  return [...paths].sort();
}

function referencedArtifactPaths(content: string): string[] {
  const paths = new Set<string>();
  for (const match of content.matchAll(/\b(?:SPEC|SOURCES|EVAL)\.md\b/g)) {
    paths.add(match[0]);
  }
  return [...paths].sort();
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\.md$/, '')
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function expandedReferenceWords(path: string): string[] {
  const aliases: Record<string, string[]> = {
    authn: ['authentication', 'identity', 'session', 'credential', 'secret'],
    authz: ['authorization', 'access', 'control', 'permission'],
    authentication: ['authn', 'login', 'identity', 'session', 'credential', 'password', 'jwt'],
    authorization: ['authz', 'access', 'control', 'permission', 'role'],
    android: ['intent', 'webview', 'keystore', 'manifest', 'mobile'],
    concurrency: ['race', 'condition', 'thread', 'lock', 'atomic'],
    csrf: ['cross', 'site', 'request', 'forgery', 'client', 'web'],
    crypto: ['cryptographic', 'encryption', 'secret', 'token', 'key'],
    deserialization: ['deserialize', 'serialized', 'unserialize', 'pickle', 'marshal'],
    ios: ['swift', 'objective', 'keychain', 'uikit', 'wkwebview', 'mobile'],
    rce: ['remote', 'code', 'execution', 'command'],
    rust: ['unsafe', 'ffi', 'transmute', 'soundness'],
    secrets: ['secret', 'credential', 'password', 'token', 'key'],
    session: ['cookie', 'csrf', 'fixation'],
    ssrf: ['server', 'side', 'request', 'forgery'],
    tls: ['cryptographic', 'certificate', 'transport', 'encryption'],
    upload: ['file', 'content', 'type'],
    xss: ['cross', 'site', 'scripting', 'client', 'web', 'injection'],
    xxe: ['xml', 'external', 'entity'],
  };
  const base = path.split('/').at(-1) ?? path;
  const set = new Set(words(base));
  for (const word of [...set]) {
    for (const alias of aliases[word] ?? []) {
      set.add(alias);
    }
  }
  if (set.has('path') || set.has('traversal')) {
    set.add('filesystem');
    set.add('file');
  }
  if (set.has('memory')) {
    set.add('corruption');
    set.add('safety');
  }
  return [...set];
}

function trackText(track: SkillBuildOutline['tracks'][number]): string {
  return [
    track.id,
    track.title,
    track.goal,
    track.rationale,
    ...track.sourceSignals,
    ...track.owns,
    ...track.excludes,
    ...track.relevanceSignals,
    ...track.evidenceFocus,
    ...track.checks,
    ...track.safeCounterpatterns,
    ...track.falsePositiveTraps,
    ...track.researchHints,
  ].join(' ').toLowerCase();
}

function closestTrackForReference(
  outline: SkillBuildOutline,
  path: string,
): SkillBuildOutline['tracks'][number] | undefined {
  const refWords = expandedReferenceWords(path);
  let best: {
    track: SkillBuildOutline['tracks'][number];
    score: number;
  } | undefined;

  for (const track of outline.tracks) {
    const text = trackText(track);
    const score = refWords.reduce(
      (sum, word) => sum + (new RegExp(`\\b${word}\\b`).test(text) ? 1 : 0),
      0,
    );
    if (!best || score > best.score) {
      best = { track, score };
    }
  }

  return best && best.score > 0 ? best.track : undefined;
}

function markdownList(items: string[], fallback: string): string {
  const values = items.length > 0 ? items : [fallback];
  return values.map((item) => `- ${item}`).join('\n');
}

function titleFromReferencePath(path: string): string {
  const base = path.split('/').at(-1)?.replace(/\.md$/, '') || 'reference';
  return words(base)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function fallbackReferenceContent(args: {
  outline: SkillBuildOutline;
  path: string;
}): string {
  const track = closestTrackForReference(args.outline, args.path);
  if (!track) {
    return `# ${titleFromReferencePath(args.path)}

Use this reference when the route in SKILL.md matches the changed hunk.

## Use When

- The SKILL.md route points to this reference for the changed hunk.

## Checks

- Trace attacker-controlled input, trust boundaries, sensitive operations, and observable impact before reporting.

## Evidence Required

- Report only findings with changed-line evidence and a plausible exploit path.

## Safe Counterpatterns

- Do not report when the changed code validates inputs, enforces access control, or preserves an existing safe invariant.

## False Positive Traps

- Do not report pattern-only findings without data flow, reachability, and impact.
`;
  }

  return `# ${track.title}

${track.goal}

## Use When

${markdownList(track.relevanceSignals, track.rationale)}

## Checks

${markdownList(track.checks, 'Trace exploitability through the changed code before reporting.')}

## Evidence Required

${markdownList(track.evidenceFocus, 'Anchor each finding to changed lines and concrete runtime behavior.')}

## Safe Counterpatterns

${markdownList(track.safeCounterpatterns, 'Do not report when the changed code preserves an existing safe invariant.')}

## False Positive Traps

${markdownList(track.falsePositiveTraps, 'Do not report pattern-only findings without reachability and impact.')}
`;
}

function backfillMissingRoutedReferences(
  fileMap: GeneratedSkillFileMap,
  outline: SkillBuildOutline,
): GeneratedSkillFileMap {
  const files = new Map(fileMap.files.map((file) => [file.path, file.content]));
  const added = new Set<string>();
  const visited = new Set<string>();
  const queue = ['SKILL.md'];

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) {
      continue;
    }
    if (visited.has(path)) {
      continue;
    }
    visited.add(path);

    const content = files.get(path);
    if (!content) {
      continue;
    }

    for (const referencePath of referencedSkillPaths(content)) {
      if (!files.has(referencePath)) {
        files.set(referencePath, fallbackReferenceContent({
          outline,
          path: referencePath,
        }));
        added.add(referencePath);
      }
      if (referencePath.startsWith('references/') && !visited.has(referencePath)) {
        queue.push(referencePath);
      }
    }
  }

  if (added.size === 0) {
    return fileMap;
  }

  return {
    ...fileMap,
    files: [...files.entries()]
      .map(([path, content]) => ({ path, content }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    validationNotes: [
      ...fileMap.validationNotes,
      `Backfilled missing routed reference file(s): ${[...added].sort().join(', ')}`,
    ],
  };
}

function prepareGeneratedFileMap(
  fileMap: GeneratedSkillFileMap,
  targetName: string,
  outline: SkillBuildOutline,
): GeneratedSkillFileMap {
  const prefilled = backfillMissingRoutedReferences(
    canonicalizeGeneratedFileMapPaths(fileMap),
    outline,
  );
  return backfillMissingRoutedReferences(
    normalizeGeneratedFileMap(prefilled, targetName),
    outline,
  );
}

function deterministicValidation(args: {
  fileMap: GeneratedSkillFileMap;
  targetName: string;
}): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = new Map(args.fileMap.files.map((file) => [file.path, file.content]));
  const skillMd = files.get('SKILL.md');

  if (!skillMd) {
    errors.push('Generated artifact file map must include SKILL.md');
    return { errors, warnings };
  }

  const frontmatter = skillFrontmatter(skillMd);
  if (!frontmatter) {
    errors.push('SKILL.md must start with YAML frontmatter');
  } else {
    if (frontmatter['name'] !== args.targetName) {
      errors.push(`SKILL.md frontmatter name must be "${args.targetName}"`);
    }
    if (typeof frontmatter['description'] !== 'string' || !frontmatter['description'].trim()) {
      errors.push('SKILL.md frontmatter description is required');
    }
  }

  if (/Generated Warden skill for outline/i.test(skillMd)) {
    warnings.push('SKILL.md contains generated-template boilerplate');
  }

  for (const file of args.fileMap.files) {
    if (!file.path.endsWith('.md')) {
      continue;
    }
    if (containsOutputContract(file.content)) {
      warnings.push(`${file.path} defines output or report format; Warden injects report schema separately`);
    }
    if (containsAuthoringMetadata(file.content)) {
      warnings.push(`${file.path} contains generated-skill authoring metadata instead of runtime guidance`);
    }
  }

  const referenceFiles = args.fileMap.files.filter((file) => file.path.startsWith('references/'));
  const routedReferenceFiles = referenceFiles.filter((file) => skillMd.includes(file.path));
  const routeDocuments = [
    skillMd,
    ...routedReferenceFiles.map((file) => file.content),
  ];
  for (const path of [...new Set(routeDocuments.flatMap(referencedSkillPaths))].sort()) {
    if (!files.has(path)) {
      warnings.push(`SKILL.md routes ${path} but the generated file map does not include it`);
    }
  }
  for (const path of referencedArtifactPaths(skillMd)) {
    if (!files.has(path)) {
      warnings.push(`SKILL.md references ${path} but the generated file map does not include it`);
    }
  }
  for (const reference of referenceFiles) {
    if (!routeDocuments.some((content) => content.includes(reference.path))) {
      warnings.push(`SKILL.md does not route runtime reference ${reference.path}`);
    }
    const lineCount = reference.content.split('\n').length;
    if (lineCount > LONG_REFERENCE_LINE_LIMIT && !/^## Contents$/m.test(reference.content)) {
      warnings.push(
        `${reference.path} is ${lineCount} lines; add ## Contents or split by lookup need`,
      );
    }
  }

  const hasRuntimeReferences = referenceFiles.length > 0;
  const sources = files.get('SOURCES.md');
  if (
    hasRuntimeReferences &&
    sources &&
    /\b(deferred|future passes|next pass|not covered in this pass)\b/i.test(sources)
  ) {
    warnings.push('SOURCES.md appears to contain stale deferred-work language while references exist');
  }

  return { errors, warnings };
}

function formatDeterministicIssues(validation: {
  errors: string[];
  warnings: string[];
}): string[] {
  return [
    ...validation.errors.map((message) => `error: ${message}`),
    ...validation.warnings.map((message) => `warning: ${message}`),
  ];
}

function hasMissingGeneratedFileWarning(validation: {
  warnings: string[];
}): boolean {
  return validation.warnings.some((warning) =>
    warning.includes('generated file map does not include it'),
  );
}

function hasCanonicalPathChanges(files: { path: string }[]): boolean {
  return files.some((file) => canonicalGeneratedArtifactPath(file.path) !== file.path);
}

function advisoryProviderIssues(
  review: GeneratedSkillReviewResult,
): GeneratedSkillReviewIssue[] {
  const issues = review.issues.map((issue) => ({
    ...issue,
    severity: 'warning' as const,
  }));
  if (!review.valid && issues.length === 0) {
    issues.push({
      severity: 'warning',
      message: 'Authoring provider marked the generated skill invalid without issue details.',
    });
  }
  return issues;
}

function reviewNeedsRevision(review: GeneratedSkillReviewResult): boolean {
  return !review.valid || review.issues.length > 0;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.trim().length > 0);
}

function mergeExternalSources(
  ...sourceSets: GeneratedSkillFileMap['externalSources'][]
): GeneratedSkillFileMap['externalSources'] {
  const sources = new Map<string, GeneratedSkillFileMap['externalSources'][number]>();
  for (const sourceSet of sourceSets) {
    for (const source of sourceSet) {
      sources.set(`${source.title}\n${source.url}`, source);
    }
  }
  return [...sources.values()];
}

function applyContributionResult(args: {
  original: GeneratedSkillFileMap;
  contribution: GeneratedSkillContribution;
  targetName: string;
  outline: SkillBuildOutline;
}): GeneratedSkillFileMap {
  const changedFiles = args.contribution.files.filter((file) => file.content.trim().length > 0);
  const candidate: GeneratedSkillFileMap = {
    ...args.original,
    files: [
      ...args.original.files.filter(
        (file) => !changedFiles.some((changed) =>
          canonicalGeneratedArtifactPath(changed.path) === canonicalGeneratedArtifactPath(file.path)
        ),
      ),
      ...changedFiles,
    ],
    validationNotes: uniqueStrings([
      ...args.original.validationNotes,
      args.contribution.summary,
      ...args.contribution.validationNotes,
    ]),
    missingInputs: uniqueStrings([
      ...args.original.missingInputs,
      ...args.contribution.missingInputs,
    ]),
    externalSources: mergeExternalSources(
      args.original.externalSources,
      args.contribution.externalSources,
    ),
  };

  return prepareGeneratedFileMap(candidate, args.targetName, args.outline);
}

function summarizeResponseModel(models: (string | undefined)[]): string | undefined {
  const distinct = [...new Set(models.filter((model): model is string => Boolean(model)))];
  if (distinct.length === 0) {
    return undefined;
  }
  if (distinct.length === 1) {
    return distinct[0];
  }
  return 'multiple';
}

function summarizeTurns(turns: (number | undefined)[]): number | undefined {
  const values = turns.filter((turn): turn is number => Number.isFinite(turn));
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((sum, value) => sum + value, 0);
}

function zeroUsage(): UsageStats {
  return { inputTokens: 0, outputTokens: 0, costUSD: 0 };
}

function loadExistingArtifact(args: {
  rootDir: string;
  files: {
    path: string;
    content: string;
  }[];
  name: string;
}): GeneratedSkillArtifact | undefined {
  const validation = deterministicValidation({
    fileMap: {
      version: 1,
      name: args.name,
      files: args.files.map((file) => ({ path: file.path, content: file.content })),
      summary: 'Existing generated artifact',
      validationNotes: [],
      missingInputs: [],
      externalSources: [],
    },
    targetName: args.name,
  });
  if (
    validation.errors.length > 0 ||
    hasMissingGeneratedFileWarning(validation) ||
    hasCanonicalPathChanges(args.files)
  ) {
    return undefined;
  }

  return {
    kind: 'generated-skill',
    source: 'cache',
    name: args.name,
    path: args.rootDir,
    bytes: filesByteLength(args.files),
    durationMs: 0,
    usage: zeroUsage(),
    externalSources: [],
    missingInputs: [],
  };
}

function loadCachedArtifact(args: {
  rootDir: string;
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  authoringProvider: SkillBuildAuthoringProvider;
}): GeneratedSkillArtifact | undefined {
  if (!existsSync(join(args.rootDir, 'SKILL.md'))) {
    return undefined;
  }

  const files = artifactFiles(args.rootDir);
  const state = readSkillBuildState(getBuildStatePath(args.rootDir));
  const metadata = state?.artifact;
  if (!metadata) {
    return loadExistingArtifact({
      rootDir: args.rootDir,
      files,
      name: args.outline.skill,
    });
  }

  const manifest = fileManifest(files);
  const bytes = filesByteLength(files);
  if (
    metadata.sourceHash !== args.source.hash ||
    metadata.outlineHash !== outlineHash(args.outline) ||
    metadata.buildVersion !== args.outline.buildVersion ||
    metadata.authoringProvider.name !== args.authoringProvider.name ||
    metadata.authoringProvider.contentHash !== args.authoringProvider.contentHash ||
    JSON.stringify(metadata.fileManifest) !== JSON.stringify(manifest) ||
    metadata.bytes !== bytes
  ) {
    return undefined;
  }

  const validation = deterministicValidation({
    fileMap: {
      version: 1,
      name: metadata.name,
      files: files.map((file) => ({ path: file.path, content: file.content })),
      summary: 'Cached generated artifact',
      validationNotes: [],
      missingInputs: metadata.missingInputs,
      externalSources: metadata.externalSources,
    },
    targetName: metadata.name,
  });
  if (
    validation.errors.length > 0 ||
    hasMissingGeneratedFileWarning(validation) ||
    hasCanonicalPathChanges(files)
  ) {
    const normalizedFileMap = prepareGeneratedFileMap(
      {
        version: 1,
        name: metadata.name,
        files: files.map((file) => ({ path: file.path, content: file.content })),
        summary: 'Cached generated artifact',
        validationNotes: [],
        missingInputs: metadata.missingInputs,
        externalSources: metadata.externalSources,
      },
      metadata.name,
      args.outline,
    );
    const normalizedValidation = deterministicValidation({
      fileMap: normalizedFileMap,
      targetName: metadata.name,
    });
    if (
      normalizedValidation.errors.length > 0 ||
      hasMissingGeneratedFileWarning(normalizedValidation)
    ) {
      return undefined;
    }

    const artifact = writeGeneratedArtifact({
      rootDir: args.rootDir,
      fileMap: normalizedFileMap,
      durationMs: metadata.durationMs,
      usage: metadata.usage,
      responseModel: metadata.responseModel,
      numTurns: metadata.numTurns,
    });
    const writtenFiles = artifactFiles(args.rootDir);
    writeSkillBuildState(getBuildStatePath(args.rootDir), {
      ...state,
      artifact: {
        ...metadata,
        fileManifest: fileManifest(writtenFiles),
        deterministicWarnings: formatDeterministicIssues(normalizedValidation),
        bytes: artifact.bytes,
        generatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    return {
      ...artifact,
      source: 'cache',
      externalSources: metadata.externalSources,
      missingInputs: metadata.missingInputs,
    };
  }

  return {
    kind: 'generated-skill',
    source: 'cache',
    name: metadata.name,
    path: args.rootDir,
    bytes,
    durationMs: metadata.durationMs,
    usage: metadata.usage,
    externalSources: metadata.externalSources,
    missingInputs: metadata.missingInputs,
    responseModel: metadata.responseModel,
    numTurns: metadata.numTurns,
  };
}

function writeGeneratedArtifact(args: {
  rootDir: string;
  fileMap: GeneratedSkillFileMap;
  durationMs: number;
  usage: UsageStats;
  responseModel?: string;
  numTurns?: number;
}): GeneratedSkillArtifact {
  clearGeneratedSkillArtifacts(args.rootDir);

  const files = args.fileMap.files.map((file) => ({
    path: file.path,
    content: normalizeFileContent(file.content),
  }));
  for (const file of files) {
    const path = join(args.rootDir, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content, 'utf-8');
  }

  return {
    kind: 'generated-skill',
    source: 'generated',
    name: args.fileMap.name,
    path: args.rootDir,
    bytes: filesByteLength(files),
    durationMs: args.durationMs,
    usage: args.usage,
    externalSources: args.fileMap.externalSources,
    missingInputs: args.fileMap.missingInputs,
    responseModel: args.responseModel,
    numTurns: args.numTurns,
  };
}

function normalizeGeneratedFileMap(
  fileMap: GeneratedSkillFileMap,
  targetName = fileMap.name,
): GeneratedSkillFileMap {
  const canonicalFileMap = canonicalizeGeneratedFileMapPaths(fileMap);
  const retainedFiles = canonicalFileMap.files
    .filter((file) => !shouldOmitGeneratedArtifact(canonicalFileMap, file));
  const retainedPaths = new Set(retainedFiles.map((file) => file.path));
  return {
    ...canonicalFileMap,
    files: retainedFiles
      .map((file) => ({
        path: file.path,
        content: normalizeFileContent(file.path === 'SKILL.md'
          ? ensureSkillFrontmatter({
            content: stripUnavailableArtifactReferences(
              stripOutputContractSections(file.content),
              retainedPaths,
            ),
            fileMap: canonicalFileMap,
            targetName,
          })
          : file.content),
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export async function buildGeneratedSkill(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  rootDir: string;
  runtime: Runtime;
  repoPath: string;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
  regenerate?: boolean;
  apiKey?: string;
  repairModel?: string;
  repairMaxRetries?: number;
  authoringSkillRoot?: string;
  onStatus?: (message: string) => void;
}): Promise<GeneratedSkillArtifact> {
  const startedAt = performance.now();
  const statePath = getBuildStatePath(args.rootDir);
  const authoringProvider = resolveAuthoringProvider({
    authoringSkillRoot: args.authoringSkillRoot,
  });

  try {
    if (!args.regenerate) {
      const cached = loadCachedArtifact({
        rootDir: args.rootDir,
        outline: args.outline,
        source: args.source,
        authoringProvider,
      });
      if (cached) {
        return cached;
      }
    }

    const previousState = readSkillBuildState(statePath);
    if (!previousState) {
      throw new GeneratedSkillBuildError(
        `Missing generated skill outline state for ${args.outline.skill}`,
      );
    }

    const maxTurns = args.maxTurns ?? defaultBuildMaxTurns(args.outline);
    const repair = {
      apiKey: args.apiKey,
      model: args.repairModel,
      maxRetries: args.repairMaxRetries,
    };

    args.onStatus?.('Planning authoring run');
    const plan = await runStructuredSkillBuilderAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
      skillName: `${args.outline.skill}:authoring-plan`,
      systemPrompt: authoringSystemPrompt(),
      userPrompt: buildAuthoringPlanPrompt({
        outline: args.outline,
        source: args.source,
        authoringSkillRoot: authoringProvider.rootDir,
        targetName: args.outline.skill,
        targetRootDir: args.rootDir,
      }),
      schema: GeneratedSkillAuthoringPlanSchema,
      model: args.model,
      maxTurns,
      abortController: args.abortController,
      repair,
    });

    args.onStatus?.('Writing skill artifacts');
    const implementation = await runStructuredSkillBuilderAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
      skillName: `${args.outline.skill}:authoring-implementation`,
      systemPrompt: authoringSystemPrompt(),
      userPrompt: buildAuthoringImplementationPrompt({
        outline: args.outline,
        source: args.source,
        authoringSkillRoot: authoringProvider.rootDir,
        targetName: args.outline.skill,
        targetRootDir: args.rootDir,
        plan: plan.data,
      }),
      schema: GeneratedSkillFileMapSchema,
      model: args.model,
      maxTurns,
      abortController: args.abortController,
      repair,
    });

    if (implementation.data.name !== args.outline.skill) {
      throw new GeneratedSkillBuildError(
        `Generated skill identity mismatch: expected ${args.outline.skill}, got ${implementation.data.name}`,
      );
    }

    let workingFileMap = prepareGeneratedFileMap(
      implementation.data,
      args.outline.skill,
      args.outline,
    );
    const contributionResults: SkillBuilderStepMetrics[] = [];

    if (args.outline.tracks.length > 1) {
      for (const track of args.outline.tracks) {
        args.onStatus?.(`Adding ${track.title}`);
        const contribution = await runStructuredSkillBuilderAgent({
          runtime: args.runtime,
          repoPath: args.repoPath,
          skillName: `${args.outline.skill}:authoring-track-${track.id}`,
          systemPrompt: authoringSystemPrompt(),
          userPrompt: buildAuthoringTrackContributionPrompt({
            outline: args.outline,
            source: args.source,
            authoringSkillRoot: authoringProvider.rootDir,
            targetName: args.outline.skill,
            targetRootDir: args.rootDir,
            plan: plan.data,
            fileMap: workingFileMap,
            track,
          }),
          schema: GeneratedSkillContributionSchema,
          model: args.model,
          maxTurns,
          abortController: args.abortController,
          repair,
        });
        contributionResults.push(contribution);
        workingFileMap = applyContributionResult({
          original: workingFileMap,
          contribution: contribution.data,
          targetName: args.outline.skill,
          outline: args.outline,
        });
      }
    }

    const reviewResults: SkillBuilderReviewResult[] = [];
    const revisionResults: SkillBuilderStepMetrics[] = [];

    let latestReview: GeneratedSkillReviewResult | undefined;
    for (let reviewRound = 0; reviewRound <= MAX_SKILL_REVISION_ATTEMPTS; reviewRound += 1) {
      const deterministic = deterministicValidation({
        fileMap: workingFileMap,
        targetName: args.outline.skill,
      });

      args.onStatus?.(reviewRound === 0
        ? 'Reviewing generated skill'
        : 'Reviewing revised skill');
      const review = await runStructuredSkillBuilderAgent({
        runtime: args.runtime,
        repoPath: args.repoPath,
        skillName: `${args.outline.skill}:authoring-validation`,
        systemPrompt: authoringSystemPrompt(),
        userPrompt: buildAuthoringValidationPrompt({
          outline: args.outline,
          source: args.source,
          authoringSkillRoot: authoringProvider.rootDir,
          targetName: args.outline.skill,
          targetRootDir: args.rootDir,
          plan: plan.data,
          fileMap: workingFileMap,
          deterministicIssues: formatDeterministicIssues(deterministic),
        }),
        schema: GeneratedSkillReviewResultSchema,
        model: args.model,
        maxTurns: Math.min(maxTurns, defaultValidationMaxTurns()),
        abortController: args.abortController,
        repair,
      });
      reviewResults.push(review);
      latestReview = review.data;

      if (
        !reviewNeedsRevision(review.data) ||
        revisionResults.length >= MAX_SKILL_REVISION_ATTEMPTS
      ) {
        break;
      }

      args.onStatus?.('Revising generated skill');
      const revision = await runStructuredSkillBuilderAgent({
        runtime: args.runtime,
        repoPath: args.repoPath,
        skillName: `${args.outline.skill}:authoring-revision`,
        systemPrompt: authoringSystemPrompt(),
        userPrompt: buildAuthoringRevisionPrompt({
          outline: args.outline,
          source: args.source,
          authoringSkillRoot: authoringProvider.rootDir,
          targetName: args.outline.skill,
          targetRootDir: args.rootDir,
          plan: plan.data,
          fileMap: workingFileMap,
          review: review.data,
          deterministicIssues: formatDeterministicIssues(deterministic),
        }),
        schema: GeneratedSkillFileMapSchema,
        model: args.model,
        maxTurns,
        abortController: args.abortController,
        repair,
      });
      if (revision.data.name !== args.outline.skill) {
        throw new GeneratedSkillBuildError(
          `Generated skill identity mismatch: expected ${args.outline.skill}, got ${revision.data.name}`,
        );
      }
      revisionResults.push(revision);
      workingFileMap = prepareGeneratedFileMap(
        revision.data,
        args.outline.skill,
        args.outline,
      );
    }

    const fileMap = workingFileMap;
    const finalDeterministic = deterministicValidation({
      fileMap,
      targetName: args.outline.skill,
    });
    if (!fileMap.files.some((file) => file.path === 'SKILL.md')) {
      throw new GeneratedSkillBuildError(
        `Generated skill build did not produce SKILL.md for ${args.outline.skill}`,
      );
    }
    const providerIssues = latestReview ? advisoryProviderIssues(latestReview) : [];

    const usage = aggregateUsage([
      plan.usage,
      implementation.usage,
      ...contributionResults.map((result) => result.usage),
      ...reviewResults.map((result) => result.usage),
      ...revisionResults.map((result) => result.usage),
    ]);
    const responseModel = summarizeResponseModel([
      plan.responseModel,
      implementation.responseModel,
      ...contributionResults.map((result) => result.responseModel),
      ...reviewResults.map((result) => result.responseModel),
      ...revisionResults.map((result) => result.responseModel),
    ]);
    const numTurns = summarizeTurns([
      plan.numTurns,
      implementation.numTurns,
      ...contributionResults.map((result) => result.numTurns),
      ...reviewResults.map((result) => result.numTurns),
      ...revisionResults.map((result) => result.numTurns),
    ]);

    const artifact = writeGeneratedArtifact({
      rootDir: args.rootDir,
      fileMap,
      durationMs: performance.now() - startedAt,
      usage,
      responseModel,
      numTurns,
    });
    const writtenFiles = artifactFiles(args.rootDir);
    writeSkillBuildState(statePath, {
      ...previousState,
      artifact: {
        version: GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION,
        sourceHash: args.source.hash,
        outlineHash: outlineHash(args.outline),
        buildVersion: args.outline.buildVersion,
        authoringProvider,
        name: artifact.name,
        fileManifest: fileManifest(writtenFiles),
        deterministicWarnings: formatDeterministicIssues(finalDeterministic),
        validationIssues: providerIssues,
        bytes: artifact.bytes,
        durationMs: artifact.durationMs,
        usage: artifact.usage,
        externalSources: artifact.externalSources,
        missingInputs: [
          ...plan.data.missingInputs,
          ...artifact.missingInputs,
          ...reviewResults.flatMap((result) => result.data.missingInputs),
        ],
        responseModel: artifact.responseModel,
        numTurns: artifact.numTurns,
        generatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    return {
      ...artifact,
      missingInputs: [
        ...plan.data.missingInputs,
        ...artifact.missingInputs,
        ...reviewResults.flatMap((result) => result.data.missingInputs),
      ],
    };
  } catch (error) {
    if (error instanceof GeneratedSkillBuildError) {
      throw error;
    }
    if (error instanceof StructuredSkillBuilderAgentError) {
      throw new GeneratedSkillBuildError(
        `Generated skill build failed for ${args.outline.skill}: ${error.message}`,
        { cause: error },
      );
    }
    if (error instanceof Error) {
      throw new GeneratedSkillBuildError(
        `Generated skill build failed for ${args.outline.skill}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}
