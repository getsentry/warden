import { readFileSync, writeFileSync } from 'node:fs';
import type { Trigger } from './schema.js';

/**
 * Generate TOML representation of a trigger.
 */
export function generateTriggerToml(trigger: Trigger): string {
  const lines: string[] = ['[[triggers]]'];
  lines.push(`name = "${trigger.name}"`);
  lines.push(`event = "${trigger.event}"`);

  // Format actions array
  const actionsStr = trigger.actions.map((a) => `"${a}"`).join(', ');
  lines.push(`actions = [${actionsStr}]`);

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
export function appendTrigger(configPath: string, trigger: Trigger): void {
  const existingContent = readFileSync(configPath, 'utf-8');

  // Ensure proper spacing before the new trigger
  const separator = existingContent.endsWith('\n\n')
    ? ''
    : existingContent.endsWith('\n')
      ? '\n'
      : '\n\n';

  const triggerToml = generateTriggerToml(trigger);
  const newContent = existingContent + separator + triggerToml + '\n';

  writeFileSync(configPath, newContent, 'utf-8');
}
