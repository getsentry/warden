/**
 * Local HTTP server for GitHub App manifest flow.
 * Serves a form that POSTs the manifest to GitHub, then receives the callback.
 */
import { type Server } from 'node:http';
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
 * Create and start a local HTTP server for the manifest flow.
 * - GET / or /start: Serves the form that POSTs to GitHub
 * - GET /callback: Receives the callback from GitHub with the code
 */
export declare function startCallbackServer(options: ServerOptions): {
    server: Server;
    waitForCallback: Promise<CallbackResult>;
    close: () => void;
    startUrl: string;
};
//# sourceMappingURL=server.d.ts.map