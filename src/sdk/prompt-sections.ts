import { findingLine, type Finding } from '../types/index.js';

export interface PromptPRContext {
  /** All files being changed in the PR */
  changedFiles: string[];
  /** PR title - explains what the change does */
  title?: string;
  /** PR description/body - explains why and provides additional context */
  body?: string | null;
  /** Max number of changed files to list. 0 disables the section. Default: 50. */
  maxContextFiles?: number;
}

const MAX_BODY_LENGTH = 1000;

/**
 * Build a tagged prompt section, omitting empty content.
 */
export function buildTaggedSection(tag: string, content: string | string[]): string | undefined {
  const body = Array.isArray(content) ? content.join('\n') : content;
  if (body.trim().length === 0) return undefined;

  return `<${tag}>
${body}
</${tag}>`;
}

/**
 * Join prompt sections with consistent spacing, skipping omitted sections.
 */
export function joinPromptSections(sections: (string | undefined)[]): string {
  return sections.filter((section): section is string => Boolean(section)).join('\n\n');
}

/**
 * Build a tagged JSON-only output contract.
 */
export function buildJsonOutputSection(instructions: string): string {
  const lines = [
    'Return only valid JSON. Do not include markdown, prose, code fences, or explanations.',
  ];
  const trimmedInstructions = instructions.trim();
  if (trimmedInstructions.length > 0) {
    lines.push('', trimmedInstructions);
  }
  return `<output_format>
${lines.join('\n')}
</output_format>`;
}

/**
 * Build tagged pull request context shared by Warden agents.
 */
export function buildPullRequestContextSection(prContext?: PromptPRContext): string | undefined {
  if (!prContext?.title) return undefined;

  const lines = [`<title>${prContext.title}</title>`];

  if (prContext.body) {
    const body = prContext.body.length > MAX_BODY_LENGTH
      ? `${prContext.body.slice(0, MAX_BODY_LENGTH)}...`
      : prContext.body;
    lines.push('<body>', body, '</body>');
  }

  return buildTaggedSection('pull_request_context', lines);
}

export interface FileListSectionOptions {
  currentFile?: string;
  maxFiles?: number;
}

/**
 * Build a tagged file list section with optional current-file exclusion.
 */
export function buildFileListSection(
  tag: string,
  files: string[],
  options: FileListSectionOptions = {}
): string | undefined {
  const maxFiles = options.maxFiles ?? 50;
  const visibleFiles = options.currentFile
    ? files.filter((f) => f !== options.currentFile)
    : files;
  if (visibleFiles.length === 0 || maxFiles === 0) return undefined;

  const displayFiles = visibleFiles.slice(0, maxFiles);
  const remaining = visibleFiles.length - displayFiles.length;
  const lines = displayFiles.map((f) => `- ${f}`);
  if (remaining > 0) {
    lines.push(`- ... and ${remaining} more`);
  }

  return buildTaggedSection(tag, lines);
}

/**
 * Build tagged changed-file context shared by Warden agents.
 */
export function buildChangedFilesSection(
  prContext: PromptPRContext | undefined,
  currentFile?: string
): string | undefined {
  if (!prContext) return undefined;
  return buildFileListSection('changed_files', prContext.changedFiles, {
    currentFile,
    maxFiles: prContext.maxContextFiles ?? 50,
  });
}

interface PromptFindingFormatOptions {
  includeSeverity?: boolean;
  includeConfidence?: boolean;
  includeVerification?: boolean;
  locationStyle?: 'line' | 'range';
  snippet?: (finding: Finding) => string | undefined;
}

function formatFindingLocation(finding: Finding, style: 'line' | 'range'): string {
  const loc = finding.location;
  if (!loc) return 'general';

  if (style === 'range' && loc.endLine) {
    return `${loc.path}:${loc.startLine}-${loc.endLine}`;
  }

  return `${loc.path}:${findingLine(finding)}`;
}

/**
 * Format one finding for prompt lists shared by auxiliary agents.
 */
export function formatFindingForPrompt(
  finding: Finding,
  options: PromptFindingFormatOptions = {}
): string {
  const details: string[] = [];
  if (options.includeSeverity) details.push(`(${finding.severity})`);
  if (options.includeConfidence && finding.confidence) {
    details.push(`[confidence: ${finding.confidence}]`);
  }

  const prefix = details.length > 0 ? `${details.join(' ')} ` : '';
  const location = formatFindingLocation(finding, options.locationStyle ?? 'line');
  let text = `[${location}] ${prefix}"${finding.title}" - ${finding.description}`;

  if (options.includeVerification && finding.verification) {
    text += ` Verification: ${finding.verification}`;
  }

  const snippet = options.snippet?.(finding);
  if (snippet) {
    text += `\n   Code: ${snippet.split('\n').join('\n   ')}`;
  }

  return text;
}

/**
 * Format findings as a stable 1-based prompt list.
 */
export function formatIndexedFindingsForPrompt(
  findings: Finding[],
  options: PromptFindingFormatOptions = {}
): string {
  return findings.map((finding, index) => {
    return `${index + 1}. ${formatFindingForPrompt(finding, options)}`;
  }).join('\n');
}
