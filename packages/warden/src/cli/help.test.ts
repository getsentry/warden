import { describe, expect, it } from 'vitest';
import { renderHelp } from './help.js';

describe('renderHelp', () => {
  it('renders scoped root help', () => {
    const output = renderHelp();

    expect(output).toContain('Commands:');
    expect(output).toContain('Global Options:');
    expect(output).toContain('build <skill>');
    expect(output).not.toContain('--org <name>');
  });

  it('renders build help without unrelated command options', () => {
    const output = renderHelp('build');

    expect(output).toContain('warden build <skill> [options]');
    expect(output).toContain('-p, --prompt <value>');
    expect(output).not.toContain('--effort');
    expect(output).not.toContain('--description');
    expect(output).not.toContain('--org <name>');
  });

  it('renders effort in run help', () => {
    const output = renderHelp('run');

    expect(output).toContain('--effort <level>');
    expect(output).toContain('Values: off, low, medium, high, xhigh, max');
  });

  it('renders improve help', () => {
    const output = renderHelp('improve');

    expect(output).toContain('warden improve <skill> [options]');
    expect(output).toContain('-p, --prompt <value>');
    expect(output).not.toContain('--regenerate');
    expect(output).not.toContain('--org <name>');
  });

  it('renders shared output flags on non-run commands that accept them', () => {
    const output = renderHelp('init');

    expect(output).toContain('-v, --verbose');
    expect(output).toContain('--debug');
    expect(output).toContain('--log');
  });

  it('renders runs show help with subcommand-specific options', () => {
    const output = renderHelp('runs:show');

    expect(output).toContain('warden runs show <files...> [options]');
    expect(output).toContain('--min-confidence <level>');
    expect(output).toContain('--report-on <severity>');
  });
});
