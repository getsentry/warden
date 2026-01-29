/**
 * Cross-platform browser opener.
 */

import { exec } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Open a URL in the default browser.
 * Returns a promise that resolves when the browser open command has been executed.
 */
export function openBrowser(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform();
    let command: string;

    switch (os) {
      case 'darwin':
        command = `open "${url}"`;
        break;
      case 'win32':
        command = `start "" "${url}"`;
        break;
      default:
        // Linux and others
        command = `xdg-open "${url}"`;
        break;
    }

    exec(command, (error) => {
      if (error) {
        reject(new Error(`Failed to open browser: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}
