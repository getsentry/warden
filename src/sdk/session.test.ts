import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  SessionCollector,
  ensureSessionsDir,
  listSessions,
  readSession,
  pruneOldSessions,
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

  describe('SessionCollector', () => {
    it('does nothing when disabled', () => {
      const collector = new SessionCollector({ enabled: false, repoPath: tempDir });
      collector.addMessage('assistant', { content: 'test' });
      const path = collector.finalize();

      expect(path).toBeUndefined();
      expect(existsSync(join(tempDir, '.warden', 'sessions'))).toBe(false);
    });

    it('captures messages when enabled', () => {
      const sessionsDir = join(tempDir, 'sessions');
      const collector = new SessionCollector({
        enabled: true,
        directory: sessionsDir,
        repoPath: tempDir,
      });

      collector.addMessage('assistant', { content: 'hello' });
      collector.addMessage('tool_progress', { tool_use_id: 'abc', elapsed: 1.5 });
      collector.addMessage('result', { subtype: 'success', result: 'done' });

      collector.updateFromResult({
        session_id: 'test-session-123',
        duration_ms: 1000,
        num_turns: 1,
      });

      const path = collector.finalize();

      expect(path).toBeDefined();
      expect(existsSync(path!)).toBe(true);

      const data = readSession(path!);
      expect(data).toBeDefined();
      expect(data!.version).toBe(1);
      expect(data!.messages).toHaveLength(3);
      expect(data!.metadata.sessionId).toBe('test-session-123');
      expect(data!.metadata.durationMs).toBe(1000);
      expect(data!.metadata.numTurns).toBe(1);
    });

    it('sets context on the session', () => {
      const sessionsDir = join(tempDir, 'sessions');
      const collector = new SessionCollector({
        enabled: true,
        directory: sessionsDir,
        repoPath: tempDir,
      });

      collector.setContext({
        skillName: 'test-skill',
        filename: 'src/test.ts',
        lineRange: '10-20',
      });
      collector.updateFromResult({ session_id: 'ctx-test' });

      const path = collector.finalize();
      const data = readSession(path!);

      expect(data!.metadata.skillName).toBe('test-skill');
      expect(data!.metadata.filename).toBe('src/test.ts');
      expect(data!.metadata.lineRange).toBe('10-20');
    });

    it('extracts model from modelUsage', () => {
      const sessionsDir = join(tempDir, 'sessions');
      const collector = new SessionCollector({
        enabled: true,
        directory: sessionsDir,
        repoPath: tempDir,
      });

      collector.updateFromResult({
        session_id: 'model-test',
        modelUsage: { 'claude-sonnet-4': { inputTokens: 100 } },
      });

      const path = collector.finalize();
      const data = readSession(path!);

      expect(data!.metadata.model).toBe('claude-sonnet-4');
    });

    it('extracts usage stats', () => {
      const sessionsDir = join(tempDir, 'sessions');
      const collector = new SessionCollector({
        enabled: true,
        directory: sessionsDir,
        repoPath: tempDir,
      });

      collector.updateFromResult({
        session_id: 'usage-test',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 20,
          cache_creation_input_tokens: 10,
        },
      });

      const path = collector.finalize();
      const data = readSession(path!);

      expect(data!.metadata.usage).toEqual({
        inputTokens: 130, // 100 + 20 + 10
        outputTokens: 50,
        cacheReadInputTokens: 20,
        cacheCreationInputTokens: 10,
        costUSD: 0,
      });
    });

    it('uses uuid if session_id is not available', () => {
      const sessionsDir = join(tempDir, 'sessions');
      const collector = new SessionCollector({
        enabled: true,
        directory: sessionsDir,
        repoPath: tempDir,
      });

      collector.updateFromResult({ uuid: 'uuid-123' });

      const path = collector.finalize();
      expect(path).toContain('uuid-123');
    });

    it('reports enabled status correctly', () => {
      const enabled = new SessionCollector({ enabled: true, repoPath: tempDir });
      const disabled = new SessionCollector({ enabled: false, repoPath: tempDir });

      expect(enabled.enabled).toBe(true);
      expect(disabled.enabled).toBe(false);
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

  describe('listSessions', () => {
    it('returns empty array for non-existent directory', () => {
      const result = listSessions(join(tempDir, 'does-not-exist'));
      expect(result).toEqual([]);
    });

    it('returns only JSON files sorted by modification time', async () => {
      const dir = join(tempDir, 'sessions');
      mkdirSync(dir);

      // Create files with different modification times
      writeFileSync(join(dir, 'old.json'), '{}');
      await new Promise((r) => setTimeout(r, 10));
      writeFileSync(join(dir, 'new.json'), '{}');
      writeFileSync(join(dir, 'not-json.txt'), 'text');

      const result = listSessions(dir);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('new.json');
      expect(result[1]).toContain('old.json');
    });
  });

  describe('readSession', () => {
    it('returns undefined for non-existent file', () => {
      const result = readSession(join(tempDir, 'missing.json'));
      expect(result).toBeUndefined();
    });

    it('reads and parses session file', () => {
      const filepath = join(tempDir, 'session.json');
      const data = {
        version: 1,
        metadata: { startTime: 1234567890 },
        messages: [{ type: 'assistant', timestamp: 1234567891, data: {} }],
      };
      writeFileSync(filepath, JSON.stringify(data));

      const result = readSession(filepath);

      expect(result).toEqual(data);
    });
  });

  describe('pruneOldSessions', () => {
    it('keeps only the most recent N sessions', async () => {
      const dir = join(tempDir, 'sessions');
      mkdirSync(dir);

      // Create 5 session files with different timestamps
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(dir, `session-${i}.json`), '{}');
        await new Promise((r) => setTimeout(r, 10));
      }

      const deleted = pruneOldSessions(dir, 2);

      expect(deleted).toBe(3);

      const remaining = listSessions(dir);
      expect(remaining).toHaveLength(2);
      // Most recent should be kept
      expect(remaining[0]).toContain('session-4.json');
      expect(remaining[1]).toContain('session-3.json');
    });

    it('returns 0 when nothing to prune', () => {
      const dir = join(tempDir, 'sessions');
      mkdirSync(dir);

      writeFileSync(join(dir, 'session-1.json'), '{}');

      const deleted = pruneOldSessions(dir, 10);

      expect(deleted).toBe(0);
    });
  });
});
