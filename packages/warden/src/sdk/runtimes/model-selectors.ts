/**
 * Return true when a Pi model selector uses provider/model-id syntax.
 */
export function isPiModelSelector(model: string): boolean {
  const slashIndex = model.indexOf('/');
  return slashIndex > 0 && slashIndex < model.length - 1;
}

export type PiModelSelectorOption = 'model' | 'auxiliaryModel' | 'synthesisModel';

export interface PiModelSelectorTarget {
  name?: string;
  runtime?: string;
  model?: string;
  auxiliaryModel?: string;
  synthesisModel?: string;
}

export interface InvalidPiModelSelector {
  specName?: string;
  option: PiModelSelectorOption;
  model: string;
}

/**
 * Format the user-facing error for an invalid Pi model selector.
 */
export function invalidPiModelSelectorMessage(invalid: InvalidPiModelSelector): string {
  const target = invalid.specName ? ` for ${invalid.specName}` : '';
  return `Pi runtime ${invalid.option}${target} must use provider/model format: ${invalid.model}`;
}

/**
 * Preserve invalid Pi selector details through shared error classification.
 */
export class InvalidPiModelSelectorError extends Error {
  invalid: InvalidPiModelSelector;

  constructor(invalid: InvalidPiModelSelector) {
    super(invalidPiModelSelectorMessage(invalid));
    this.name = 'InvalidPiModelSelectorError';
    this.invalid = invalid;
  }
}

/**
 * Find the first Pi runner option using a model ID that is not provider/model.
 */
export function findInvalidPiModelSelector(
  targets: PiModelSelectorTarget[]
): InvalidPiModelSelector | undefined {
  for (const target of targets) {
    const runtimeName = target.runtime ?? 'pi';
    if (runtimeName !== 'pi') {
      continue;
    }

    for (const option of ['model', 'auxiliaryModel', 'synthesisModel'] as const) {
      const model = target[option];
      if (model && !isPiModelSelector(model)) {
        return { specName: target.name, option, model };
      }
    }
  }

  return undefined;
}

/**
 * Throw when any Pi runner option is not a provider/model selector.
 */
export function assertValidPiModelSelectors(targets: PiModelSelectorTarget[]): void {
  const invalid = findInvalidPiModelSelector(targets);
  if (invalid) {
    throw new InvalidPiModelSelectorError(invalid);
  }
}
