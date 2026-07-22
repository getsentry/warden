import { Sentry } from '../sentry.js';
import { classifyError, SkillRunnerError } from '../sdk/errors.js';
import type { ErrorCode } from '../types/index.js';

interface TriggerErrorContext {
  triggerName: string;
  skillName: string;
}

function shouldFingerprintTriggerError(code: ErrorCode): boolean {
  return (
    code === 'provider_unavailable'
    || code === 'all_hunks_failed'
    || code === 'invalid_model_selector'
  );
}

/**
 * Capture trigger failures with stable tags and grouped fingerprints.
 */
export function captureActionTriggerError(error: unknown, context: TriggerErrorContext): ErrorCode {
  const { code } = classifyError(error);
  const providerContext = error instanceof SkillRunnerError ? error.providerContext : undefined;
  Sentry.captureException(error, {
    tags: {
      'warden.trigger.name': context.triggerName,
      'gen_ai.agent.name': context.skillName,
      'warden.error.code': code,
      ...(providerContext?.provider ? { 'gen_ai.provider.name': providerContext.provider } : {}),
      ...(providerContext?.model ? { 'gen_ai.request.model': providerContext.model } : {}),
    },
    ...(providerContext ? { contexts: { provider_error: { ...providerContext } } } : {}),
    ...(shouldFingerprintTriggerError(code) ? { fingerprint: ['warden', code] } : {}),
  });
  return code;
}
