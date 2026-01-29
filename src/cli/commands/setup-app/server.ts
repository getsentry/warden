/**
 * Local HTTP server for receiving GitHub App manifest flow callback.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

export interface CallbackResult {
  code: string;
  state: string;
}

export interface ServerOptions {
  port: number;
  expectedState: string;
  timeoutMs: number;
}

/**
 * Create and start a local HTTP server to receive the GitHub callback.
 * Returns a promise that resolves with the callback code and state.
 */
export function startCallbackServer(options: ServerOptions): {
  server: Server;
  waitForCallback: Promise<CallbackResult>;
  close: () => void;
} {
  let resolveCallback: (result: CallbackResult) => void;
  let rejectCallback: (error: Error) => void;

  const waitForCallback = new Promise<CallbackResult>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Only handle GET requests to /callback
    if (req.method !== 'GET' || !req.url?.startsWith('/callback')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    try {
      const url = new URL(req.url, `http://localhost:${options.port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      // Validate state parameter (CSRF protection)
      if (state !== options.expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error: Invalid state parameter</h1>
            <p>This may be a CSRF attack. Please try again.</p>
          </body>
          </html>
        `);
        rejectCallback(new Error('Invalid state parameter - possible CSRF attack'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error: Missing code parameter</h1>
            <p>GitHub did not provide the expected authorization code.</p>
          </body>
          </html>
        `);
        rejectCallback(new Error('Missing code parameter in callback'));
        return;
      }

      // Success - send response and resolve promise
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Success</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #28a745; }
          </style>
        </head>
        <body>
          <h1>GitHub App Created!</h1>
          <p>You can close this window and return to the terminal.</p>
        </body>
        </html>
      `);

      resolveCallback({ code, state });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <h1>Internal Error</h1>
          <p>Something went wrong. Please try again.</p>
        </body>
        </html>
      `);
      rejectCallback(error instanceof Error ? error : new Error(String(error)));
    }
  });

  // Bind only to localhost for security
  server.listen(options.port, '127.0.0.1');

  // Set up timeout
  const timeoutId = setTimeout(() => {
    rejectCallback(new Error(`Timeout: No callback received within ${options.timeoutMs / 1000} seconds`));
    server.close();
  }, options.timeoutMs);

  const close = () => {
    clearTimeout(timeoutId);
    server.close();
  };

  return { server, waitForCallback, close };
}
