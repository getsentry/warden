/**
 * Cross-platform browser opener.
 */

import { execFile } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Open a URL in the default browser.
 * Returns a promise that resolves when the browser open command has been executed.
 * Uses execFile (no shell) to avoid command injection via URL.
 */
export function openBrowser(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform();
    let command: string;
    let args: string[];

    switch (os) {
      case 'darwin':
        command = 'open';
        args = [url];
        break;
      case 'win32':
        command = 'cmd';
        args = ['/c', 'start', '', url];
        break;
      default:
        // Linux and others
        command = 'xdg-open';
        args = [url];
        break;
    }

    execFile(command, args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
