/**
 * Local HTTP server for GitHub App manifest flow.
 * Serves a form that POSTs the manifest to GitHub, then receives the callback.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import type { GitHubAppManifest } from './manifest.js';

export interface CallbackResult {
  code: string;
}

export interface ServerOptions {
  port: number;
  expectedState: string;
  timeoutMs: number;
  manifest: GitHubAppManifest;
  org?: string;
}

/**
 * Build the HTML page that auto-submits the manifest form to GitHub.
 */
function buildStartPage(manifest: GitHubAppManifest, state: string, org?: string): string {
  const githubUrl = org
    ? `https://github.com/organizations/${org}/settings/apps/new?state=${state}`
    : `https://github.com/settings/apps/new?state=${state}`;

  const manifestJson = JSON.stringify(manifest);

  return `<!DOCTYPE html>
<html>
<head>
  <title>Creating GitHub App...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>Redirecting to GitHub...</h1>
  <div class="spinner"></div>
  <p>If you are not redirected automatically, click the button below.</p>
  <form id="manifest-form" action="${githubUrl}" method="post">
    <input type="hidden" name="manifest" value='${manifestJson.replace(/'/g, '&#39;')}'>
    <button type="submit" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Continue to GitHub</button>
  </form>
  <script>
    // Auto-submit the form after a brief delay
    setTimeout(function() {
      document.getElementById('manifest-form').submit();
    }, 500);
  </script>
</body>
</html>`;
}

/**
 * Create and start a local HTTP server for the manifest flow.
 * - GET / or /start: Serves the form that POSTs to GitHub
 * - GET /callback: Receives the callback from GitHub with the code
 */
export function startCallbackServer(options: ServerOptions): {
  server: Server;
  waitForCallback: Promise<CallbackResult>;
  close: () => void;
  startUrl: string;
} {
  let resolveCallback: (result: CallbackResult) => void;
  let rejectCallback: (error: Error) => void;

  const waitForCallback = new Promise<CallbackResult>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${options.port}`);

    // Serve the start page that auto-submits to GitHub
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/start')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(buildStartPage(options.manifest, options.expectedState, options.org));
      return;
    }

    // Handle callback from GitHub
    if (req.method === 'GET' && url.pathname === '/callback') {
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

      resolveCallback({ code });
      return;
    }

    // 404 for anything else
    res.writeHead(404);
    res.end('Not found');
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

  const startUrl = `http://localhost:${options.port}/start`;

  return { server, waitForCallback, close, startUrl };
}
