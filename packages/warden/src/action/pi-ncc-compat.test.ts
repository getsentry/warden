import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { preloadPiRuntimeForActionBundle } from './pi-ncc-compat.js';

function nccBuiltinError(specifier: string): Error & { code: string } {
  return Object.assign(new Error(`Cannot find module '${specifier}'`), {
    code: 'MODULE_NOT_FOUND',
  });
}

describe('preloadPiRuntimeForActionBundle', () => {
  it('ignores ncc dynamic-import failures for Pi Node built-ins', async () => {
    const unhandledRejections = new EventEmitter();

    await expect(preloadPiRuntimeForActionBundle(
      async () => {
        unhandledRejections.emit('unhandledRejection', nccBuiltinError('node:os'));
      },
      unhandledRejections,
      async () => {
        unhandledRejections.emit('unhandledRejection', nccBuiltinError('node:os'));
      }
    )).resolves.toBeUndefined();

    expect(unhandledRejections.listenerCount('unhandledRejection')).toBe(0);
  });

  it('preloads ncc-sensitive providers after preloading Pi', async () => {
    const calls: string[] = [];

    await preloadPiRuntimeForActionBundle(
      async () => {
        calls.push('runtime');
      },
      new EventEmitter(),
      async () => {
        calls.push('providers');
      }
    );

    expect(calls).toEqual(['runtime', 'providers']);
  });

  it('keeps unexpected unhandled rejections fatal', async () => {
    const unhandledRejections = new EventEmitter();

    await expect(preloadPiRuntimeForActionBundle(async () => {
      unhandledRejections.emit('unhandledRejection', new Error('real failure'));
    }, unhandledRejections, async () => undefined)).rejects.toThrow('real failure');

    expect(unhandledRejections.listenerCount('unhandledRejection')).toBe(0);
  });
});
