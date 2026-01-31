/**
 * Exchange temporary code for GitHub App credentials via GitHub API.
 */
export interface AppCredentials {
    id: number;
    name: string;
    pem: string;
    htmlUrl: string;
}
/**
 * Exchange a temporary code for GitHub App credentials.
 * This uses the GitHub API to convert the code into full app credentials.
 */
export declare function exchangeCodeForCredentials(code: string): Promise<AppCredentials>;
//# sourceMappingURL=credentials.d.ts.map