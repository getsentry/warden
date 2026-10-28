import { setImmediate as waitForImmediate } from 'node:timers/promises';

type UnhandledRejectionListener = (reason: unknown) => void;
type PiRuntimeImporter = () => Promise<unknown>;
type PiProviderPreloader = () => Promise<void>;

interface UnhandledRejectionTarget {
  prependListener(eventName: 'unhandledRejection', listener: UnhandledRejectionListener): unknown;
  removeListener(eventName: 'unhandledRejection', listener: UnhandledRejectionListener): unknown;
}

const NCC_PI_BUILTIN_IMPORT_ERRORS = new Set([
  "Cannot find module 'node:fs'",
  "Cannot find module 'node:os'",
  "Cannot find module 'node:path'",
]);

function isNccPiBuiltinImportFailure(reason: unknown): boolean {
  return (
    reason instanceof Error &&
    'code' in reason &&
    reason.code === 'MODULE_NOT_FOUND' &&
    NCC_PI_BUILTIN_IMPORT_ERRORS.has(reason.message)
  );
}

async function preloadPiProviderModulesForActionBundle(): Promise<void> {
  const [{ setBedrockProviderModule }, { bedrockProviderModule }] = await Promise.all([
    import('@earendil-works/pi-ai/api/bedrock-converse-stream.lazy'),
    import('@earendil-works/pi-ai/bedrock-provider'),
    import('@earendil-works/pi-ai/api/openai-codex-responses.lazy'),
  ]);

  setBedrockProviderModule(bedrockProviderModule);
}

/**
 * Preload Pi before action initialization so ncc's dynamic-import rewrite for
 * Pi's env-key helper and node-only providers cannot terminate the bundled GitHub Action.
 */
export async function preloadPiRuntimeForActionBundle(
  importPiRuntime: PiRuntimeImporter = () => import('../sdk/runtimes/pi.js'),
  unhandledRejections: UnhandledRejectionTarget = process,
  preloadProviders: PiProviderPreloader = preloadPiProviderModulesForActionBundle,
): Promise<void> {
  let unexpectedRejection: unknown;
  const onUnhandledRejection = (reason: unknown) => {
    if (isNccPiBuiltinImportFailure(reason)) {
      return;
    }
    unexpectedRejection = reason;
  };

  unhandledRejections.prependListener('unhandledRejection', onUnhandledRejection);
  try {
    await importPiRuntime();
    await preloadProviders();
    // ncc emits the synthetic missing-builtin rejections after Pi module
    // evaluation, so drain two turns before removing the temporary listener.
    await waitForImmediate();
    await waitForImmediate();
  } finally {
    unhandledRejections.removeListener('unhandledRejection', onUnhandledRejection);
  }

  if (unexpectedRejection) {
    throw unexpectedRejection;
  }
}
