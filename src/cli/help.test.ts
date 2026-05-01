import { describe, expect, it } from 'vitest';
import { renderHelp } from './help.js';

describe('renderHelp', () => {
  it('renders scoped root help', () => {
    const output = renderHelp();

    expect(output).toContain('Commands:');
    expect(output).toContain('Global Options:');
    expect(output).toContain('improve <skill>');
    expect(output).toContain('synth <skill>');
    expect(output).not.toContain('Ignore cached Superwarden artifacts and synthesize again');
    expect(output).not.toContain('--org <name>');
  });

  it('renders synth help without unrelated command options', () => {
    const output = renderHelp('synthesize');

    expect(output).toContain('warden synth <skill> [options]');
    expect(output).toContain('-p, --prompt <value>');
    expect(output).toContain('--parallel <n>');
    expect(output).toContain('--show-plan');
    expect(output).not.toContain('--description');
    expect(output).not.toContain('--org <name>');
  });

  it('renders improve help with feedback import options only', () => {
    const output = renderHelp('improve');

    expect(output).toContain('warden improve <skill> --from <run.jsonl> [options]');
    expect(output).toContain('--from <jsonl>');
    expect(output).toContain('--parallel <n>');
    expect(output).not.toContain('--prompt <value>');
    expect(output).not.toContain('--show-plan');
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
    expect(output).not.toContain('--show-plan');
  });
});
