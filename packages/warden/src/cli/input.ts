import { createInterface } from 'node:readline/promises';

export interface PromptMultilineOptions {
  hint?: string | false;
  prompt?: string;
}

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

function createPromptInterface() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  rl.on('SIGINT', () => {
    rl.close();
  });
  return rl;
}

/**
 * Prompt for a single line of text on stderr.
 */
export async function promptLine(question: string): Promise<string> {
  const rl = createPromptInterface();
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } catch {
    throw new UserAbortError();
  } finally {
    rl.close();
  }
}

/**
 * Prompt for multiline text on stderr. The user finishes with an empty line.
 */
export async function promptMultiline(intro: string, options: PromptMultilineOptions = {}): Promise<string> {
  const rl = createPromptInterface();
  const lines: string[] = [];
  const hint = options.hint === undefined ? 'Finish with an empty line.' : options.hint;
  const prompt = options.prompt ?? '> ';
  try {
    process.stderr.write(`${intro}\n`);
    if (hint) {
      process.stderr.write(`${hint}\n`);
    }
    while (true) {
      const line = await rl.question(prompt);
      if (line.trim() === '' && lines.length > 0) {
        break;
      }
      if (line.trim() === '' && lines.length === 0) {
        continue;
      }
      lines.push(line);
    }
    process.stderr.write('\n');
    return lines.join('\n').trim();
  } catch {
    throw new UserAbortError();
  } finally {
    rl.close();
  }
}
