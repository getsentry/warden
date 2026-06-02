import {
  APIError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@anthropic-ai/sdk';
import type { ErrorCode } from '../types/index.js';
import { InvalidPiModelSelectorError } from './runtimes/model-selectors.js';

export class SkillRunnerError extends Error {
  /** Optional classification so callers skip message-sniffing. */
  code?: ErrorCode;
  constructor(message: string, options?: { cause?: unknown; code?: ErrorCode }) {
    super(message, options);
    this.name = 'SkillRunnerError';
    if (options?.code) this.code = options.code;
  }
}

const SENSITIVE_VALUE = '[redacted]';

/**
 * Remove likely credential material before an error message is surfaced through
 * logs, callbacks, reports, or telemetry.
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/\b(sk-ant-[A-Za-z0-9_-]+)/g, SENSITIVE_VALUE)
    .replace(/\b(sk-[A-Za-z0-9_-]{16,})\b/g, SENSITIVE_VALUE)
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, `$1${SENSITIVE_VALUE}`)
    .replace(
      /\b(authorization)(\s*[:=]\s*)(["']?)(Bearer\s+)?[^"',\s)]+/gi,
      (_match, key: string, separator: string, quote: string, bearer: string | undefined) =>
        `${key}${separator}${quote}${bearer ?? ''}${SENSITIVE_VALUE}`
    )
    .replace(
      /\b(api[_-]?key|x-api-key|auth[_-]?token|oauth[_-]?token|token)(\s*[:=]\s*)(["']?)[^"',\s)]+/gi,
      `$1$2$3${SENSITIVE_VALUE}`
    );
}

/** Patterns that indicate an authentication failure */
const AUTH_ERROR_PATTERNS = [
  'authentication',
  'unauthorized',
  'invalid.*api.*key',
  'invalid.*key',
  'not.*logged.*in',
  'login.*required',
  'api key',
];

/**
 * Check if an error message indicates an authentication failure.
 */
export function isAuthenticationErrorMessage(message: string): boolean {
  return AUTH_ERROR_PATTERNS.some((pattern) => new RegExp(pattern, 'i').test(message));
}

/** User-friendly error message for authentication failures (Claude runtime) */
const CLAUDE_AUTH_GUIDANCE = `
  claude login                             # Use local Claude Code auth
  export WARDEN_ANTHROPIC_API_KEY=sk-...   # Or use API key

https://console.anthropic.com/ for API keys`;

/** User-friendly error message for authentication failures (Pi runtime) */
const PI_AUTH_GUIDANCE = `
  export WARDEN_MODEL=provider/model-id    # e.g. openai/gpt-5.5
  export WARDEN_{PROVIDER}_API_KEY=...     # WARDEN-prefixed key for that provider

See https://warden.sentry.dev/config/models for provider selectors and credential names.`;

/** IPC/subprocess failure error codes (EPIPE, ECONNRESET, etc.) */
const IPC_ERROR_CODES = ['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ENOTCONN'];

/**
 * Check if an error is an IPC/subprocess failure.
 * These occur when the Claude Code subprocess can't communicate (e.g., sandbox restrictions).
 */
export function isSubprocessError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Check error.code property (Node.js ErrnoException) first
  const errorCode = (error as NodeJS.ErrnoException).code;
  if (errorCode && IPC_ERROR_CODES.includes(errorCode)) return true;
  // Fallback: check the original error message only, not appended stderr content.
  // executeQuery appends "\nClaude Code stderr: ..." which could contain IPC codes
  // from debug output, causing false positives.
  const stderrIdx = error.message.indexOf('\nClaude Code stderr:');
  const message = stderrIdx >= 0 ? error.message.slice(0, stderrIdx) : error.message;
  return IPC_ERROR_CODES.some((code) => message.includes(code));
}

export class WardenAuthenticationError extends Error {
  constructor(sdkError?: string, options?: { cause?: unknown; runtime?: string }) {
    const { cause, runtime } = options ?? {};
    const guidance = runtime === 'pi' ? PI_AUTH_GUIDANCE : CLAUDE_AUTH_GUIDANCE;
    const message = sdkError
      ? `Authentication failed: ${sdkError}\n${guidance}`
      : `Authentication required.${guidance}`;
    super(message, { cause });
    this.name = 'WardenAuthenticationError';
  }
}

/**
 * Check if an error is retryable.
 * Retries on: rate limits (429), server errors (5xx), connection errors, timeouts.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof InternalServerError) return true;
  if (error instanceof APIConnectionError) return true;
  if (error instanceof APIConnectionTimeoutError) return true;

  // Check for generic APIError with retryable status codes
  if (error instanceof APIError) {
    const status = error.status;
    if (status === 429) return true;
    if (status !== undefined && status >= 500 && status < 600) return true;
  }

  return false;
}

/**
 * Check if an error indicates an unavailable provider/runtime.
 * These failures can recover later, but repeated failures should stop the run.
 */
function isProviderUnavailableError(error: unknown): boolean {
  if (isRetryableError(error)) return true;

  const message = error instanceof Error ? error.message : String(error);
  return (
    /Claude Code process exited with code \d+/i.test(message) ||
    /Claude Code stderr:[\s\S]*\b(overloaded|rate limit|timed? out|timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT)\b/i.test(message)
  );
}

/**
 * Check if an error is an authentication failure.
 * These require user action (login or API key) and should not be retried.
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof APIError && error.status === 401) {
    return true;
  }

  // Check error message for common auth failure patterns
  const message = error instanceof Error ? error.message : String(error);
  return isAuthenticationErrorMessage(message);
}

/** Classify an unknown error into a stable ErrorCode + message. */
export function classifyError(error: unknown): { code: ErrorCode; message: string } {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown error');

  if (error instanceof WardenAuthenticationError) {
    return { code: 'auth_failed', message };
  }
  if (error instanceof SkillRunnerError && error.code) {
    return { code: error.code, message };
  }
  if (error instanceof InvalidPiModelSelectorError) {
    return { code: 'invalid_model_selector', message };
  }
  if (isSubprocessError(error)) {
    return { code: 'subprocess_failure', message };
  }
  if (isAuthenticationError(error)) {
    return { code: 'auth_failed', message };
  }
  if (isProviderUnavailableError(error)) {
    return { code: 'provider_unavailable', message: humanizeProviderError(error) };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return { code: 'aborted', message };
  }
  if (/\baborted\b/i.test(message)) {
    return { code: 'aborted', message };
  }
  return { code: 'unknown', message };
}

interface ProviderErrorDetails {
  type?: string;
  message?: string;
}

interface JsonObjectCandidate {
  value: unknown;
  end: number;
}

/** Human-friendly messages for known Anthropic API error types. */
const ANTHROPIC_ERROR_LABELS: Record<string, string> = {
  overloaded_error: 'Anthropic is overloaded — try again later.',
  rate_limit_error: 'Anthropic rate limit reached — try again later.',
  api_error: 'Anthropic API error — try again later.',
  authentication_error: 'Anthropic authentication error.',
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : undefined;
}

function stringProperty(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value ? value : undefined;
}

function providerErrorDetailsFromPayload(payload: unknown): ProviderErrorDetails | undefined {
  const record = asRecord(payload);
  if (!record) return undefined;

  const error = asRecord(record['error']);
  if (!error) return undefined;

  const type = stringProperty(error, 'type');
  if (!type && stringProperty(record, 'type') !== 'error') return undefined;

  const details = {
    type,
    message: stringProperty(error, 'message'),
  };
  return details.type || details.message ? details : undefined;
}

function providerErrorDetailsFromApiError(error: APIError): ProviderErrorDetails | undefined {
  const payloadDetails = providerErrorDetailsFromPayload((error as APIError & { error?: unknown }).error);
  if (payloadDetails) return payloadDetails;

  const record = error as unknown as Record<string, unknown>;
  const type = stringProperty(record, 'type');
  return type ? { type, message: error.message } : undefined;
}

function humanizeProviderErrorDetails(details: ProviderErrorDetails): string | undefined {
  if (details.type) {
    const label = ANTHROPIC_ERROR_LABELS[details.type];
    if (label) return label;
  }
  return details.message;
}

function parseJsonObjectCandidate(message: string, start: number): JsonObjectCandidate | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < message.length; index++) {
    const char = message.charAt(index);
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth++;
      continue;
    }
    if (char !== '}') {
      continue;
    }

    depth--;
    if (depth !== 0) {
      continue;
    }

    const end = index + 1;
    try {
      return {
        value: JSON.parse(message.slice(start, end)) as unknown,
        end,
      };
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function trimJsonPrefix(message: string, jsonStart: number): string {
  let prefix = message.slice(0, jsonStart).trimEnd();
  while (prefix.endsWith(':')) {
    prefix = prefix.slice(0, -1).trimEnd();
  }
  return prefix.trim();
}

function humanizeProviderErrorString(message: string): string | undefined {
  let firstObjectStart: number | undefined;

  for (let index = 0; index < message.length; index++) {
    if (message.charAt(index) !== '{') continue;
    firstObjectStart ??= index;

    const candidate = parseJsonObjectCandidate(message, index);
    if (!candidate) continue;

    const details = providerErrorDetailsFromPayload(candidate.value);
    const summary = details ? humanizeProviderErrorDetails(details) : undefined;
    if (summary) return summary;

    index = candidate.end - 1;
  }

  if (firstObjectStart === undefined) return undefined;

  const prefix = trimJsonPrefix(message, firstObjectStart);
  return prefix || undefined;
}

/**
 * Extract a human-readable summary from a raw provider error.
 *
 * Structured Anthropic error bodies are preferred so summaries are based on the
 * provider error type. String errors fall back to parsing embedded JSON objects
 * before returning the text prefix or original message.
 */
export function humanizeProviderError(error: unknown): string {
  const details = error instanceof APIError
    ? providerErrorDetailsFromApiError(error)
    : providerErrorDetailsFromPayload(error);
  const structuredSummary = details ? humanizeProviderErrorDetails(details) : undefined;
  if (structuredSummary) return structuredSummary;

  const message = error instanceof Error ? error.message : String(error);
  return humanizeProviderErrorString(message) ?? message;
}

/** Map an internal extract.ts error string to a stable public ErrorCode. */
export function mapExtractionErrorCode(raw: string | undefined): ErrorCode {
  if (!raw) return 'unknown';
  if (raw === 'invalid_json') return 'extraction_invalid_json';
  if (raw === 'unbalanced_json') return 'extraction_unbalanced_json';
  if (raw === 'no_findings_json' || raw === 'no_findings_to_extract') return 'extraction_no_findings_json';
  if (raw === 'missing_findings_key') return 'extraction_missing_findings_key';
  if (raw === 'findings_not_array') return 'extraction_findings_not_array';
  if (raw === 'no_api_key_for_fallback') return 'extraction_no_api_key';
  if (raw.startsWith('llm_extraction_failed')) {
    if (/timeout|timed out/i.test(raw)) return 'extraction_llm_timeout';
    return 'extraction_llm_failed';
  }
  return 'unknown';
}
