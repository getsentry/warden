import type { Trigger } from './schema.js';
/**
 * Generate TOML representation of a trigger.
 */
export declare function generateTriggerToml(trigger: Trigger): string;
/**
 * Append a trigger to the warden.toml configuration file.
 * Preserves existing content and formatting by appending to the end.
 */
export declare function appendTrigger(configPath: string, trigger: Trigger): void;
//# sourceMappingURL=writer.d.ts.map