/**
 * Read a single keypress from stdin in raw mode.
 */
export async function readSingleKey(): Promise<string> {
  return new Promise((resolve) => {
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
        process.exit(130);
      }

      resolve(key.toLowerCase());
    });
  });
}
