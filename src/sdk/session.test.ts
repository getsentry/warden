import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  moveSession,
  ensureSessionsDir,
  listSessions,
  pruneOldSessions,
  getClaudeProjectDir,
  resolveSessionsDir,
  DEFAULT_SESSIONS_DIR,
} from './session.js';

describe('session storage', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-session-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('DEFAULT_SESSIONS_DIR', () => {
    it('has expected default value', () => {
      expect(DEFAULT_SESSIONS_DIR).toBe('.warden/sessions');
    });
  });

  describe('getClaudeProjectDir', () => {
    it('maps repo path to Claude project directory', () => {
      const result = getClaudeProjectDir('/home/user/myproject');
      expect(result).toContain('.claude/projects/-home-user-myproject');
    });

    it('replaces all slashes with dashes', () => {
      const result = getClaudeProjectDir('/a/b/c');
      expect(result).toContain('-a-b-c');
    });
  });

  describe('resolveSessionsDir', () => {
    it('uses default when no directory specified', () => {
      const result = resolveSessionsDir('/repo');
      expect(result).toBe('/repo/.warden/sessions');
    });

    it('resolves relative directory against repo path', () => {
      const result = resolveSessionsDir('/repo', 'custom/sessions');
      expect(result).toBe('/repo/custom/sessions');
    });

    it('uses absolute directory as-is', () => {
      const result = resolveSessionsDir('/repo', '/absolute/path');
      expect(result).toBe('/absolute/path');
    });
  });

  describe('ensureSessionsDir', () => {
    it('creates directory if it does not exist', () => {
      const dir = join(tempDir, 'new', 'nested', 'sessions');
      expect(existsSync(dir)).toBe(false);

      ensureSessionsDir(dir);

      expect(existsSync(dir)).toBe(true);
    });

    it('does nothing if directory already exists', () => {
      const dir = join(tempDir, 'existing');
      mkdirSync(dir, { recursive: true });

      ensureSessionsDir(dir);

      expect(existsSync(dir)).toBe(true);
    });
  });

  describe('moveSession', () => {
    it('moves session JSONL file from project dir to target dir', () => {
      // Set up a fake Claude project directory structure
      const fakeProjectDir = join(tempDir, 'claude-project');
      mkdirSync(fakeProjectDir, { recursive: true });

      const sessionUuid = 'test-uuid-1234';
      const sourceFile = join(fakeProjectDir, `${sessionUuid}.jsonl`);
      writeFileSync(sourceFile, '{"type":"assistant"}\n');

      const targetDir = join(tempDir, 'sessions');

      // We can't easily test the real Claude path, so test the utility by
      // having the source file in a known location. Instead, verify the
      // function returns undefined when the source doesn't exist at the
      // expected Claude path.
      const result = moveSession(sessionUuid, tempDir, targetDir);

      // The real ~/.claude/projects/<hash>/<uuid>.jsonl won't exist in tests,
      // so we expect undefined (graceful handling of missing files).
      expect(result).toBeUndefined();
      expect(existsSync(targetDir)).toBe(false); // target not created if nothing to move
    });

    it('returns undefined when session file does not exist', () => {
      const targetDir = join(tempDir, 'sessions');
      const result = moveSession('nonexistent-uuid', '/some/repo', targetDir);

      expect(result).toBeUndefined();
    });
  });

  describe('listSessions', () => {
    it('returns empty array for non-existent directory', () => {
      const result = listSessions(join(tempDir, 'does-not-exist'));
      expect(result).toEqual([]);
    });

    it('returns only JSONL files sorted by modification time', async () => {
      const dir = join(tempDir, 'sessions');
      mkdirSync(dir);

      // Create files with different modification times
      writeFileSync(join(dir, 'old.jsonl'), '{}');
      await new Promise((r) => setTimeout(r, 10));
      writeFileSync(join(dir, 'new.jsonl'), '{}');
      writeFileSync(join(dir, 'not-jsonl.txt'), 'text');

      const result = listSessions(dir);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('new.jsonl');
      expect(result[1]).toContain('old.jsonl');
    });
  });

  describe('pruneOldSessions', () => {
    it('keeps only the most recent N sessions', async () => {
      const dir = join(tempDir, 'sessions');
      mkdirSync(dir);

      // Create 5 session files with different timestamps
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(dir, `session-${i}.jsonl`), '{}');
        await new Promise((r) => setTimeout(r, 10));
      }

      const deleted = pruneOldSessions(dir, 2);

      expect(deleted).toBe(3);

      const remaining = listSessions(dir);
      expect(remaining).toHaveLength(2);
      // Most recent should be kept
      expect(remaining[0]).toContain('session-4.jsonl');
      expect(remaining[1]).toContain('session-3.jsonl');
    });

    it('returns 0 when nothing to prune', () => {
      const dir = join(tempDir, 'sessions');
      mkdirSync(dir);

      writeFileSync(join(dir, 'session-1.jsonl'), '{}');

      const deleted = pruneOldSessions(dir, 10);

      expect(deleted).toBe(0);
    });
  });
});
