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
  hook_attributes: { active: boolean };
  redirect_url: string;
  public: boolean;
  default_permissions: Record<string, string>;
  default_events: string[];
}

/**
 * Build a GitHub App manifest for Warden.
 */
export function buildManifest(options: ManifestOptions): GitHubAppManifest {
  const name = options.name ?? 'Warden';

  return {
    name,
    url: 'https://github.com/getsentry/warden',
    hook_attributes: { active: false },
    redirect_url: `http://localhost:${options.port}/callback`,
    public: false,
    default_permissions: {
      contents: 'read',
      pull_requests: 'write',
      issues: 'write',
      checks: 'write',
      metadata: 'read',
    },
    default_events: ['pull_request'],
  };
}
