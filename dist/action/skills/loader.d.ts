import type { SkillDefinition } from '../config/schema.js';
export declare class SkillLoaderError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 * A loaded skill with its source entry path.
 */
export interface LoadedSkill {
    skill: SkillDefinition;
    /** The entry name (file or directory) where the skill was found */
    entry: string;
}
/**
 * Conventional skill directories, checked in priority order.
 *
 * Skills are discovered from these directories in order:
 * 1. .warden/skills - Warden-specific skills (highest priority)
 * 2. .agents/skills - General agent skills (shared across tools)
 * 3. .claude/skills - Claude Code skills (for compatibility)
 *
 * Skills follow the agentskills.io specification:
 * - skill-name/SKILL.md (directory with SKILL.md inside - preferred)
 * - skill-name.md (flat markdown with SKILL.md frontmatter format)
 *
 * When a skill name exists in multiple directories, the first one found wins.
 * This allows project-specific skills in .warden/skills to override shared skills.
 */
export declare const SKILL_DIRECTORIES: readonly [".warden/skills", ".agents/skills", ".claude/skills"];
/**
 * Resolve a skill path, handling absolute paths, tilde expansion, and relative paths.
 */
export declare function resolveSkillPath(nameOrPath: string, repoRoot?: string): string;
/**
 * Clear the skills cache. Useful for testing or when skills may have changed.
 */
export declare function clearSkillsCache(): void;
/**
 * Options for loading a skill from markdown.
 */
export interface LoadSkillFromMarkdownOptions {
    /** Callback for reporting warnings (e.g., invalid tool names) */
    onWarning?: (message: string) => void;
}
/**
 * Load a skill from a SKILL.md file (agentskills.io format).
 */
export declare function loadSkillFromMarkdown(filePath: string, options?: LoadSkillFromMarkdownOptions): Promise<SkillDefinition>;
/**
 * Load a skill from a file (agentskills.io format .md files).
 */
export declare function loadSkillFromFile(filePath: string): Promise<SkillDefinition>;
/**
 * Options for loading skills from a directory.
 */
export interface LoadSkillsOptions {
    /** Callback for reporting warnings (e.g., failed skill loading) */
    onWarning?: (message: string) => void;
}
/**
 * Load all skills from a directory.
 *
 * Supports the agentskills.io specification:
 * - skill-name/SKILL.md (directory with SKILL.md inside - preferred)
 * - skill-name.md (flat markdown with SKILL.md frontmatter format)
 *
 * Results are cached to avoid repeated disk reads.
 *
 * @returns Map of skill name to LoadedSkill (includes entry path for tracking)
 */
export declare function loadSkillsFromDirectory(dirPath: string, options?: LoadSkillsOptions): Promise<Map<string, LoadedSkill>>;
/**
 * A discovered skill with source metadata.
 */
export interface DiscoveredSkill {
    skill: SkillDefinition;
    /** Relative directory path where the skill was found (e.g., "./.agents/skills") */
    directory: string;
    /** Full path to the skill */
    path: string;
}
/**
 * Discover all available skills from conventional directories.
 *
 * @param repoRoot - Repository root path for finding skills
 * @param options - Options for skill loading (e.g., warning callback)
 * @returns Map of skill name to discovered skill info
 */
export declare function discoverAllSkills(repoRoot?: string, options?: LoadSkillsOptions): Promise<Map<string, DiscoveredSkill>>;
export interface ResolveSkillOptions {
    /** Remote repository reference (e.g., "owner/repo" or "owner/repo@sha") */
    remote?: string;
    /** Skip network operations - only use cache for remote skills */
    offline?: boolean;
}
/**
 * Resolve a skill by name or path.
 *
 * Resolution order:
 * 1. Remote repository (if remote option is set)
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load SKILL.md from it
 *    - File: load the .md file directly
 * 3. Conventional directories (if repoRoot provided)
 *    - .warden/skills/{name}/SKILL.md or .warden/skills/{name}.md
 *    - .agents/skills/{name}/SKILL.md or .agents/skills/{name}.md
 *    - .claude/skills/{name}/SKILL.md or .claude/skills/{name}.md
 */
export declare function resolveSkillAsync(nameOrPath: string, repoRoot?: string, options?: ResolveSkillOptions): Promise<SkillDefinition>;
//# sourceMappingURL=loader.d.ts.map