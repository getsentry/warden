/**
 * GitHub App manifest builder for the setup-app flow.
 */
export interface ManifestOptions {
    name?: string;
    port: number;
}
export interface GitHubAppManifest {
    name: string;
    url: string;
    hook_attributes: {
        url: string;
        active: boolean;
    };
    redirect_url: string;
    public: boolean;
    default_permissions: Record<string, string>;
    default_events: string[];
}
/**
 * Build a GitHub App manifest for Warden.
 */
export declare function buildManifest(options: ManifestOptions): GitHubAppManifest;
//# sourceMappingURL=manifest.d.ts.map