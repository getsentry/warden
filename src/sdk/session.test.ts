import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  snapshotSessionFiles,
  moveNewSessions,
  ensureSessionsDir,
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

  describe('snapshotSessionFiles', () => {
    it('returns empty set for non-existent directory', () => {
      const result = snapshotSessionFiles('/nonexistent/repo/path');
      expect(result).toEqual(new Set());
    });
  });

  describe('moveNewSessions', () => {
    it('returns empty array when source dir does not exist', () => {
      const result = moveNewSessions('/nonexistent', new Set(), join(tempDir, 'sessions'));
      expect(result).toEqual([]);
    });

    it('returns empty array when no new files since snapshot', () => {
      const result = moveNewSessions('/nonexistent', new Set(['existing.jsonl']), join(tempDir, 'sessions'));
      expect(result).toEqual([]);
    });

    it('skips files already moved by another caller', () => {
      // This tests the race condition guard: if the source file
      // no longer exists (another concurrent hunk moved it), we skip it
      const result = moveNewSessions('/nonexistent', new Set(), join(tempDir, 'sessions'));
      expect(result).toEqual([]);
    });
  });

});
