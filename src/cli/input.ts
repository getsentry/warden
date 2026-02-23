/**
 * Custom error thrown when the user aborts via Ctrl+C during interactive input.
 * Allows callers to handle cleanup (e.g. Sentry flush) before exiting.
 */
export class UserAbortError extends Error {
  constructor() {
    super('User aborted');
    this.name = 'UserAbortError';
  }
}

/**
 * Read a single keypress from stdin in raw mode.
 */
export async function readSingleKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    stdin.setRawMode(true);
    stdin.resume();

    stdin.once('data', (data) => {
      stdin.setRawMode(wasRaw);
      stdin.pause();

      const key = data.toString();

      // Handle Ctrl+C
      if (key === '\x03') {
        process.stderr.write('\n');
        reject(new UserAbortError());
        return;
      }

      resolve(key.toLowerCase());
    });
  });
}
