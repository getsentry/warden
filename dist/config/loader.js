import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { WardenConfigSchema, } from './schema.js';
export class ConfigLoadError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'ConfigLoadError';
    }
}
export function loadWardenConfig(repoPath) {
    const configPath = join(repoPath, 'warden.toml');
    if (!existsSync(configPath)) {
        throw new ConfigLoadError(`Configuration file not found: ${configPath}`);
    }
    let content;
    try {
        content = readFileSync(configPath, 'utf-8');
    }
    catch (error) {
        throw new ConfigLoadError(`Failed to read configuration file: ${configPath}`, { cause: error });
    }
    let rawConfig;
    try {
        rawConfig = parseToml(content);
    }
    catch (error) {
        throw new ConfigLoadError('Failed to parse TOML configuration', { cause: error });
    }
    // Detect legacy [[triggers]] format and provide migration guidance
    if (rawConfig && typeof rawConfig === 'object' && 'triggers' in rawConfig) {
        throw new ConfigLoadError('Legacy [[triggers]] format detected. Migrate to [[skills]] format:\n\n' +
            '  [[triggers]]               →  [[skills]]\n' +
            '  name = "my-skill"              name = "my-skill"\n' +
            '  event = "pull_request"     →  [[skills.triggers]]\n' +
            '  skill = "my-skill"              type = "pull_request"\n' +
            '  actions = [...]                 actions = [...]\n\n' +
            'See the migration guide for details.');
    }
    const result = WardenConfigSchema.safeParse(rawConfig);
    if (!result.success) {
        const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
        throw new ConfigLoadError(`Invalid configuration:\n${issues}`);
    }
    return result.data;
}
/**
 * Convert empty strings to undefined.
 * GitHub Actions substitutes unconfigured secrets with empty strings,
 * so we need to treat '' as "not set" for optional config values.
 */
function emptyToUndefined(value) {
    return value === '' ? undefined : value;
}
/**
 * Resolve all skills in a config into a flat array of ResolvedTriggers.
 * Each skill x trigger combination produces one entry.
 * Skills with no triggers produce one wildcard entry (type: '*').
 *
 * Model precedence (highest to lowest):
 * 1. trigger-level model
 * 2. skill-level model
 * 3. defaults.model (warden.toml [defaults])
 * 4. cliModel (--model flag)
 * 5. WARDEN_MODEL env var
 * 6. SDK default (not set here)
 */
export function resolveSkillConfigs(config, cliModel) {
    const defaults = config.defaults;
    const envModel = emptyToUndefined(process.env['WARDEN_MODEL']);
    const result = [];
    for (const skill of config.skills) {
        const baseModel = emptyToUndefined(skill.model) ??
            emptyToUndefined(defaults?.model) ??
            emptyToUndefined(cliModel) ??
            envModel;
        // Merge ignorePaths: skill-level + defaults (additive, not override)
        const mergedIgnorePaths = [
            ...(defaults?.ignorePaths ?? []),
            ...(skill.ignorePaths ?? []),
        ];
        const filters = {
            paths: skill.paths,
            ignorePaths: mergedIgnorePaths.length > 0 ? mergedIgnorePaths : undefined,
        };
        if (!skill.triggers || skill.triggers.length === 0) {
            // Wildcard: no triggers means run everywhere
            result.push({
                name: skill.name,
                skill: skill.name,
                type: '*',
                remote: skill.remote,
                filters,
                failOn: skill.failOn ?? defaults?.failOn,
                reportOn: skill.reportOn ?? defaults?.reportOn,
                maxFindings: skill.maxFindings ?? defaults?.maxFindings,
                reportOnSuccess: skill.reportOnSuccess ?? defaults?.reportOnSuccess,
                requestChanges: skill.requestChanges ?? defaults?.requestChanges,
                failCheck: skill.failCheck ?? defaults?.failCheck,
                model: baseModel,
                maxTurns: skill.maxTurns ?? defaults?.maxTurns,
            });
        }
        else {
            for (const trigger of skill.triggers) {
                result.push({
                    name: skill.name,
                    skill: skill.name,
                    type: trigger.type,
                    actions: trigger.actions,
                    remote: skill.remote,
                    filters,
                    // 3-level merge: trigger > skill > defaults
                    failOn: trigger.failOn ?? skill.failOn ?? defaults?.failOn,
                    reportOn: trigger.reportOn ?? skill.reportOn ?? defaults?.reportOn,
                    maxFindings: trigger.maxFindings ?? skill.maxFindings ?? defaults?.maxFindings,
                    reportOnSuccess: trigger.reportOnSuccess ?? skill.reportOnSuccess ?? defaults?.reportOnSuccess,
                    requestChanges: trigger.requestChanges ?? skill.requestChanges ?? defaults?.requestChanges,
                    failCheck: trigger.failCheck ?? skill.failCheck ?? defaults?.failCheck,
                    model: emptyToUndefined(trigger.model) ?? baseModel,
                    maxTurns: trigger.maxTurns ?? skill.maxTurns ?? defaults?.maxTurns,
                    schedule: trigger.schedule,
                });
            }
        }
    }
    return result;
}
//# sourceMappingURL=loader.js.map