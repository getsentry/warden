import { setImmediate as waitForImmediate } from 'node:timers/promises';

type UnhandledRejectionListener = (reason: unknown) => void;

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

/**
 * Preload Pi before action initialization so ncc's dynamic-import rewrite for
 * Pi's env-key helper cannot terminate the bundled GitHub Action.
 */
export async function preloadPiRuntimeForActionBundle(
  importPiRuntime: () => Promise<unknown> = () => import('../sdk/runtimes/pi.js'),
  unhandledRejections: UnhandledRejectionTarget = process,
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
