import { readFileSync, writeFileSync } from 'node:fs';
/**
 * Generate TOML representation of a skill.
 */
export function generateSkillToml(skill) {
    const lines = ['[[skills]]'];
    lines.push(`name = "${skill.name}"`);
    if (skill.remote) {
        lines.push(`remote = "${skill.remote}"`);
    }
    // Skill-level fields
    if (skill.paths && skill.paths.length > 0) {
        const pathsStr = skill.paths.map((p) => `"${p}"`).join(', ');
        lines.push(`paths = [${pathsStr}]`);
    }
    if (skill.ignorePaths && skill.ignorePaths.length > 0) {
        const ignoreStr = skill.ignorePaths.map((p) => `"${p}"`).join(', ');
        lines.push(`ignorePaths = [${ignoreStr}]`);
    }
    if (skill.model) {
        lines.push(`model = "${skill.model}"`);
    }
    if (skill.failOn) {
        lines.push(`failOn = "${skill.failOn}"`);
    }
    if (skill.reportOn) {
        lines.push(`reportOn = "${skill.reportOn}"`);
    }
    if (skill.maxFindings) {
        lines.push(`maxFindings = ${skill.maxFindings}`);
    }
    if (skill.maxTurns) {
        lines.push(`maxTurns = ${skill.maxTurns}`);
    }
    if (skill.reportOnSuccess !== undefined) {
        lines.push(`reportOnSuccess = ${skill.reportOnSuccess}`);
    }
    // Nested triggers
    if (skill.triggers) {
        for (const trigger of skill.triggers) {
            lines.push('');
            lines.push('[[skills.triggers]]');
            lines.push(`type = "${trigger.type}"`);
            if (trigger.actions && trigger.actions.length > 0) {
                const actionsStr = trigger.actions.map((a) => `"${a}"`).join(', ');
                lines.push(`actions = [${actionsStr}]`);
            }
            // Trigger-level overrides
            if (trigger.model) {
                lines.push(`model = "${trigger.model}"`);
            }
            if (trigger.failOn) {
                lines.push(`failOn = "${trigger.failOn}"`);
            }
            if (trigger.reportOn) {
                lines.push(`reportOn = "${trigger.reportOn}"`);
            }
            if (trigger.maxFindings) {
                lines.push(`maxFindings = ${trigger.maxFindings}`);
            }
            if (trigger.maxTurns) {
                lines.push(`maxTurns = ${trigger.maxTurns}`);
            }
            if (trigger.reportOnSuccess !== undefined) {
                lines.push(`reportOnSuccess = ${trigger.reportOnSuccess}`);
            }
            if (trigger.schedule) {
                lines.push('');
                lines.push('[skills.triggers.schedule]');
                if (trigger.schedule.issueTitle) {
                    lines.push(`issueTitle = "${trigger.schedule.issueTitle}"`);
                }
                if (trigger.schedule.createFixPR !== undefined) {
                    lines.push(`createFixPR = ${trigger.schedule.createFixPR}`);
                }
                if (trigger.schedule.fixBranchPrefix && trigger.schedule.fixBranchPrefix !== 'warden-fix') {
                    lines.push(`fixBranchPrefix = "${trigger.schedule.fixBranchPrefix}"`);
                }
            }
        }
    }
    return lines.join('\n');
}
/**
 * Append a skill to the warden.toml configuration file.
 * Preserves existing content and formatting by appending to the end.
 */
export function appendSkill(configPath, skill) {
    const existingContent = readFileSync(configPath, 'utf-8');
    // Ensure proper spacing before the new skill
    let separator;
    if (existingContent.endsWith('\n\n')) {
        separator = '';
    }
    else if (existingContent.endsWith('\n')) {
        separator = '\n';
    }
    else {
        separator = '\n\n';
    }
    const skillToml = generateSkillToml(skill);
    const newContent = existingContent + separator + skillToml + '\n';
    writeFileSync(configPath, newContent, 'utf-8');
}
//# sourceMappingURL=writer.js.map