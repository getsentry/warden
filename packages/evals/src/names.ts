import type { EvalMeta } from './types.js';
import type { VerificationEvalMeta } from './verify.js';

type NamedEvalMeta = Pick<EvalMeta | VerificationEvalMeta, 'skillName' | 'name'>;

export function formatEvalId(meta: NamedEvalMeta): string {
  return `${meta.skillName}/${meta.name}`;
}

export function formatEvalTestName(meta: NamedEvalMeta & { given: string }): string {
  return `${formatEvalId(meta)}: ${meta.given}`;
}
