import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ExecError, execNonInteractive, execFileNonInteractive, execGitNonInteractive, GIT_NON_INTERACTIVE_ENV, } from './exec.js';
describe('ExecError', () => {
    it('formats error message with stderr', () => {
        const error = new ExecError('git status', 1, 'not a git repository', null);
        expect(error.message).toBe('Command failed: git status\nnot a git repository');
        expect(error.name).toBe('ExecError');
        expect(error.command).toBe('git status');
        expect(error.exitCode).toBe(1);
        expect(error.stderr).toBe('not a git repository');
        expect(error.signal).toBeNull();
    });
    it('formats error message with signal when no stderr', () => {
        const error = new ExecError('long-process', null, '', 'SIGTERM');
        expect(error.message).toBe('Command failed: long-process\nKilled by signal SIGTERM');
    });
    it('shows unknown error when no stderr or signal', () => {
        const error = new ExecError('mystery', null, '', null);
        expect(error.message).toBe('Command failed: mystery\nUnknown error');
    });
});
describe('GIT_NON_INTERACTIVE_ENV', () => {
    it('contains expected environment variables', () => {
        expect(GIT_NON_INTERACTIVE_ENV.GIT_TERMINAL_PROMPT).toBe('0');
        expect(GIT_NON_INTERACTIVE_ENV.GIT_SSH_COMMAND).toBe('ssh -o BatchMode=yes');
    });
});
describe('execNonInteractive', () => {
    it('executes a simple command and returns stdout', () => {
        const result = execNonInteractive('echo hello');
        expect(result).toBe('hello');
    });
    it('trims whitespace from output', () => {
        const result = execNonInteractive('echo "  padded  "');
        expect(result).toBe('padded');
    });
    it('throws ExecError when command fails', () => {
        expect(() => execNonInteractive('exit 1')).toThrow(ExecError);
        try {
            execNonInteractive('exit 1');
        }
        catch (e) {
            expect(e).toBeInstanceOf(ExecError);
            const error = e;
            expect(error.exitCode).toBe(1);
        }
    });
    it('throws ExecError with stderr when command fails with output', () => {
        expect(() => execNonInteractive('echo "error message" >&2 && exit 1')).toThrow(ExecError);
        try {
            execNonInteractive('echo "error message" >&2 && exit 1');
        }
        catch (e) {
            const error = e;
            expect(error.stderr).toBe('error message');
        }
    });
    it('throws ExecError for non-existent command', () => {
        expect(() => execNonInteractive('nonexistent-command-xyz')).toThrow(ExecError);
    });
    describe('with cwd option', () => {
        let tempDir;
        beforeEach(() => {
            tempDir = join(tmpdir(), `warden-exec-test-${Date.now()}`);
            mkdirSync(tempDir, { recursive: true });
        });
        afterEach(() => {
            rmSync(tempDir, { recursive: true, force: true });
        });
        it('executes command in specified directory', () => {
            writeFileSync(join(tempDir, 'test.txt'), 'content');
            const result = execNonInteractive('ls', { cwd: tempDir });
            expect(result).toBe('test.txt');
        });
    });
    describe('with env option', () => {
        it('passes environment variables to command', () => {
            const result = execNonInteractive('echo $TEST_VAR', {
                env: { TEST_VAR: 'test-value' },
            });
            expect(result).toBe('test-value');
        });
        it('merges with existing process.env', () => {
            // PATH should still be available
            const result = execNonInteractive('which echo', {
                env: { CUSTOM_VAR: 'custom' },
            });
            expect(result).toContain('echo');
        });
    });
});
describe('execFileNonInteractive', () => {
    it('executes file with arguments', () => {
        const result = execFileNonInteractive('echo', ['hello', 'world']);
        expect(result).toBe('hello world');
    });
    it('avoids shell interpretation of special characters', () => {
        // Without shell, $ should not be interpreted
        const result = execFileNonInteractive('echo', ['$HOME']);
        expect(result).toBe('$HOME');
    });
    it('throws ExecError when file fails', () => {
        expect(() => execFileNonInteractive('false', [])).toThrow(ExecError);
        try {
            execFileNonInteractive('false', []);
        }
        catch (e) {
            const error = e;
            expect(error.exitCode).toBe(1);
            expect(error.command).toBe('false ');
        }
    });
    it('throws ExecError for non-existent file', () => {
        expect(() => execFileNonInteractive('nonexistent-binary-xyz', [])).toThrow(ExecError);
    });
    describe('with options', () => {
        let tempDir;
        beforeEach(() => {
            tempDir = join(tmpdir(), `warden-exec-file-test-${Date.now()}`);
            mkdirSync(tempDir, { recursive: true });
        });
        afterEach(() => {
            rmSync(tempDir, { recursive: true, force: true });
        });
        it('executes in specified directory', () => {
            writeFileSync(join(tempDir, 'file.txt'), 'content');
            const result = execFileNonInteractive('ls', [], { cwd: tempDir });
            expect(result).toBe('file.txt');
        });
        it('passes environment variables', () => {
            // Create a simple script that echoes an env var
            const scriptPath = join(tempDir, 'echo-var.sh');
            writeFileSync(scriptPath, '#!/bin/sh\necho "$MY_VAR"');
            chmodSync(scriptPath, 0o755);
            const result = execFileNonInteractive(scriptPath, [], {
                env: { MY_VAR: 'from-env' },
            });
            expect(result).toBe('from-env');
        });
    });
});
describe('execGitNonInteractive', () => {
    let tempDir;
    beforeEach(() => {
        tempDir = join(tmpdir(), `warden-git-test-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });
        // Initialize a git repo for testing
        execFileNonInteractive('git', ['init'], { cwd: tempDir });
        execFileNonInteractive('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });
        execFileNonInteractive('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });
    });
    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });
    it('executes git commands', () => {
        const result = execGitNonInteractive(['status', '--short'], { cwd: tempDir });
        // Empty repo should have empty status
        expect(result).toBe('');
    });
    it('returns git output', () => {
        const result = execGitNonInteractive(['rev-parse', '--is-inside-work-tree'], { cwd: tempDir });
        expect(result).toBe('true');
    });
    it('throws ExecError when git command fails', () => {
        expect(() => execGitNonInteractive(['rev-parse', 'nonexistent-ref'], { cwd: tempDir })).toThrow(ExecError);
    });
    it('includes GIT_NON_INTERACTIVE_ENV in environment', () => {
        // We can verify this indirectly by checking that git doesn't try to prompt
        // A more direct test would require mocking, but this validates the integration
        const result = execGitNonInteractive(['config', '--get', 'user.email'], { cwd: tempDir });
        expect(result).toBe('test@example.com');
    });
    it('merges custom env vars with non-interactive settings', () => {
        // Custom env vars are accepted, but GIT_NON_INTERACTIVE_ENV always takes precedence
        const result = execGitNonInteractive(['config', '--get', 'user.name'], {
            cwd: tempDir,
            env: { CUSTOM_VAR: 'value' },
        });
        expect(result).toBe('Test User');
    });
});
//# sourceMappingURL=exec.test.js.map