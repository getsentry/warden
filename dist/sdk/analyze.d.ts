import type { SkillDefinition } from '../config/schema.js';
import type { Finding } from '../types/index.js';
import { type PRPromptContext } from './prompt.js';
import { type SkillRunnerOptions, type PreparedFile, type FileAnalysisCallbacks, type FileAnalysisResult } from './types.js';
import type { EventContext, SkillReport } from '../types/index.js';
/**
 * Analyze a single prepared file's hunks.
 */
export declare function analyzeFile(skill: SkillDefinition, file: PreparedFile, repoPath: string, options?: SkillRunnerOptions, callbacks?: FileAnalysisCallbacks, prContext?: PRPromptContext): Promise<FileAnalysisResult>;
/**
 * Generate a summary of findings.
 */
export declare function generateSummary(skillName: string, findings: Finding[]): string;
/**
 * Run a skill on a PR, analyzing each hunk separately.
 */
export declare function runSkill(skill: SkillDefinition, context: EventContext, options?: SkillRunnerOptions): Promise<SkillReport>;
//# sourceMappingURL=analyze.d.ts.map