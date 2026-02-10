import type { SkillConfig } from './schema.js';
/**
 * Generate TOML representation of a skill.
 */
export declare function generateSkillToml(skill: SkillConfig): string;
/**
 * Append a skill to the warden.toml configuration file.
 * Preserves existing content and formatting by appending to the end.
 */
export declare function appendSkill(configPath: string, skill: SkillConfig): void;
//# sourceMappingURL=writer.d.ts.map