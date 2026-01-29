import { readFileSync, writeFileSync } from 'node:fs';
/**
 * Generate TOML representation of a trigger.
 */
export function generateTriggerToml(trigger) {
    const lines = ['[[triggers]]'];
    lines.push(`name = "${trigger.name}"`);
    lines.push(`event = "${trigger.event}"`);
    // Format actions array (optional for schedule events)
    if (trigger.actions && trigger.actions.length > 0) {
        const actionsStr = trigger.actions.map((a) => `"${a}"`).join(', ');
        lines.push(`actions = [${actionsStr}]`);
    }
    lines.push(`skill = "${trigger.skill}"`);
    // Optional fields
    if (trigger.filters) {
        if (trigger.filters.paths && trigger.filters.paths.length > 0) {
            lines.push('');
            lines.push('[triggers.filters]');
            const pathsStr = trigger.filters.paths.map((p) => `"${p}"`).join(', ');
            lines.push(`paths = [${pathsStr}]`);
        }
        if (trigger.filters.ignorePaths && trigger.filters.ignorePaths.length > 0) {
            if (!trigger.filters.paths) {
                lines.push('');
                lines.push('[triggers.filters]');
            }
            const ignoreStr = trigger.filters.ignorePaths.map((p) => `"${p}"`).join(', ');
            lines.push(`ignorePaths = [${ignoreStr}]`);
        }
    }
    if (trigger.output) {
        lines.push('');
        lines.push('[triggers.output]');
        if (trigger.output.failOn) {
            lines.push(`failOn = "${trigger.output.failOn}"`);
        }
        if (trigger.output.commentOn) {
            lines.push(`commentOn = "${trigger.output.commentOn}"`);
        }
        if (trigger.output.maxFindings) {
            lines.push(`maxFindings = ${trigger.output.maxFindings}`);
        }
        if (trigger.output.labels && trigger.output.labels.length > 0) {
            const labelsStr = trigger.output.labels.map((l) => `"${l}"`).join(', ');
            lines.push(`labels = [${labelsStr}]`);
        }
    }
    if (trigger.model) {
        lines.push(`model = "${trigger.model}"`);
    }
    return lines.join('\n');
}
/**
 * Append a trigger to the warden.toml configuration file.
 * Preserves existing content and formatting by appending to the end.
 */
export function appendTrigger(configPath, trigger) {
    const existingContent = readFileSync(configPath, 'utf-8');
    // Ensure proper spacing before the new trigger
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
    const triggerToml = generateTriggerToml(trigger);
    const newContent = existingContent + separator + triggerToml + '\n';
    writeFileSync(configPath, newContent, 'utf-8');
}
//# sourceMappingURL=writer.js.map