import { type SkillDefinition } from '../config/schema.js';
export declare class SkillLoaderError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/** Conventional skill directories, checked in order */
export declare const SKILL_DIRECTORIES: readonly [".warden/skills", ".claude/skills", ".agents/skills"];
/**
 * Clear the skills cache. Useful for testing or when skills may have changed.
 */
export declare function clearSkillsCache(): void;
/**
 * Load a skill from a SKILL.md file (agentskills.io format).
 */
export declare function loadSkillFromMarkdown(filePath: string): Promise<SkillDefinition>;
/**
 * Load a skill from a TOML file.
 */
export declare function loadSkillFromToml(filePath: string): Promise<SkillDefinition>;
/**
 * Load a skill from a file (supports both SKILL.md and .toml).
 */
export declare function loadSkillFromFile(filePath: string): Promise<SkillDefinition>;
/**
 * Load all skills from a directory.
 * Supports both agentskills.io format (skill-name/SKILL.md) and flat .toml files.
 * Results are cached to avoid repeated disk reads.
 */
export declare function loadSkillsFromDirectory(dirPath: string): Promise<Map<string, SkillDefinition>>;
/**
 * Get a built-in skill by name.
 */
export declare function getBuiltinSkill(name: string): Promise<SkillDefinition | undefined>;
/**
 * Get all built-in skill names.
 */
export declare function getBuiltinSkillNames(): Promise<string[]>;
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
 * @returns Map of skill name to discovered skill info
 */
export declare function discoverAllSkills(repoRoot?: string): Promise<Map<string, DiscoveredSkill>>;
/**
 * Resolve a skill by name or path.
 *
 * Resolution order:
 * 1. Inline skills from config
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load SKILL.md from it
 *    - File: load the file directly
 * 3. Conventional directories (if repoRoot provided)
 *    - .warden/skills/{name}/SKILL.md or .warden/skills/{name}.toml
 *    - .claude/skills/{name}/SKILL.md or .claude/skills/{name}.toml
 *    - .agents/skills/{name}/SKILL.md or .agents/skills/{name}.toml
 * 4. Built-in skills
 */
export declare function resolveSkillAsync(nameOrPath: string, repoRoot?: string, inlineSkills?: SkillDefinition[]): Promise<SkillDefinition>;
//# sourceMappingURL=loader.d.ts.map