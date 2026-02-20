import fs from 'node:fs';
import path from 'node:path';
import type { UsageStats } from '../types/index.js';

/** Default directory for session storage relative to repo root */
export const DEFAULT_SESSIONS_DIR = '.warden/sessions';

/** Message captured during SDK execution */
export interface SessionMessage {
  type: 'assistant' | 'tool_progress' | 'tool_result' | 'result' | 'auth_status' | 'system';
  timestamp: number;
  data: unknown;
}

/** Metadata about a session */
export interface SessionMetadata {
  sessionId?: string;
  uuid?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  durationApiMs?: number;
  numTurns?: number;
  totalCostUsd?: number;
  model?: string;
  skillName?: string;
  filename?: string;
  lineRange?: string;
  usage?: UsageStats;
}

/** Complete session data written to disk */
export interface SessionData {
  version: 1;
  metadata: SessionMetadata;
  messages: SessionMessage[];
}

/** Options for session storage */
export interface SessionStorageOptions {
  /** Enable session storage (default: false) */
  enabled?: boolean;
  /** Directory to store sessions (default: .warden/sessions) */
  directory?: string;
  /** Base path for the repository (for resolving relative directory) */
  repoPath?: string;
}

/**
 * Collector for capturing SDK messages during query execution.
 * Create one per query, call addMessage() for each SDK message,
 * then finalize() to write the session to disk.
 */
export class SessionCollector {
  private messages: SessionMessage[] = [];
  private metadata: SessionMetadata;
  private options: Required<Pick<SessionStorageOptions, 'enabled' | 'directory'>> & { repoPath?: string };

  constructor(options: SessionStorageOptions = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      directory: options.directory ?? DEFAULT_SESSIONS_DIR,
      repoPath: options.repoPath,
    };
    this.metadata = {
      startTime: Date.now(),
    };
  }

  /** Check if session storage is enabled */
  get enabled(): boolean {
    return this.options.enabled;
  }

  /** Set skill context for the session */
  setContext(context: { skillName?: string; filename?: string; lineRange?: string }): void {
    if (context.skillName) this.metadata.skillName = context.skillName;
    if (context.filename) this.metadata.filename = context.filename;
    if (context.lineRange) this.metadata.lineRange = context.lineRange;
  }

  /** Add a message to the session transcript */
  addMessage(type: SessionMessage['type'], data: unknown): void {
    if (!this.options.enabled) return;

    this.messages.push({
      type,
      timestamp: Date.now(),
      data,
    });
  }

  /** Update session metadata from SDK result */
  updateFromResult(result: {
    session_id?: string;
    uuid?: string;
    duration_ms?: number;
    duration_api_ms?: number;
    num_turns?: number;
    total_cost_usd?: number;
    modelUsage?: Record<string, unknown>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  }): void {
    if (result.session_id) this.metadata.sessionId = result.session_id;
    if (result.uuid) this.metadata.uuid = result.uuid;
    if (result.duration_ms !== undefined) this.metadata.durationMs = result.duration_ms;
    if (result.duration_api_ms !== undefined) this.metadata.durationApiMs = result.duration_api_ms;
    if (result.num_turns !== undefined) this.metadata.numTurns = result.num_turns;
    if (result.total_cost_usd !== undefined) this.metadata.totalCostUsd = result.total_cost_usd;

    // Extract model from modelUsage
    if (result.modelUsage) {
      const models = Object.keys(result.modelUsage);
      if (models.length === 1 && models[0]) {
        this.metadata.model = models[0];
      }
    }

    // Extract usage stats
    if (result.usage) {
      const inputTokens = result.usage.input_tokens ?? 0;
      const outputTokens = result.usage.output_tokens ?? 0;
      const cacheRead = result.usage.cache_read_input_tokens ?? 0;
      const cacheWrite = result.usage.cache_creation_input_tokens ?? 0;
      this.metadata.usage = {
        inputTokens: inputTokens + cacheRead + cacheWrite,
        outputTokens,
        cacheReadInputTokens: cacheRead,
        cacheCreationInputTokens: cacheWrite,
        costUSD: 0, // Cost is calculated separately from result.total_cost_usd
      };
    }
  }

  /**
   * Finalize and write the session to disk.
   * Returns the path to the written session file, or undefined if storage is disabled.
   */
  finalize(): string | undefined {
    if (!this.options.enabled) return undefined;

    this.metadata.endTime = Date.now();

    const sessionData: SessionData = {
      version: 1,
      metadata: this.metadata,
      messages: this.messages,
    };

    // Build session filename: timestamp-sessionId.json
    const timestamp = new Date(this.metadata.startTime).toISOString().replace(/[:.]/g, '-');
    const sessionId = this.metadata.sessionId ?? this.metadata.uuid ?? 'unknown';
    const filename = `${timestamp}-${sessionId}.json`;

    // Resolve directory path
    const baseDir = this.options.repoPath ?? process.cwd();
    const sessionsDir = path.isAbsolute(this.options.directory)
      ? this.options.directory
      : path.join(baseDir, this.options.directory);

    // Ensure directory exists
    ensureSessionsDir(sessionsDir);

    // Write session file
    const filepath = path.join(sessionsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2), 'utf-8');

    return filepath;
  }
}

/**
 * Ensure the sessions directory exists.
 * Creates the directory and any parent directories if they don't exist.
 */
export function ensureSessionsDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * List all session files in the given directory.
 * Returns an array of session file paths sorted by modification time (newest first).
 */
export function listSessions(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));

  // Sort by modification time, newest first
  return files.sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
}

/**
 * Read a session file from disk.
 */
export function readSession(filepath: string): SessionData | undefined {
  if (!fs.existsSync(filepath)) {
    return undefined;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as SessionData;
}

/**
 * Delete old sessions, keeping only the most recent N sessions.
 */
export function pruneOldSessions(dir: string, keepCount: number): number {
  const sessions = listSessions(dir);
  const toDelete = sessions.slice(keepCount);

  for (const filepath of toDelete) {
    fs.unlinkSync(filepath);
  }

  return toDelete.length;
}
