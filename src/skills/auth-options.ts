/**
 * Optional authentication options for remote skill/agent fetches.
 */
export interface RemoteAuthOptions {
  /**
   * GitHub token for authenticating private remote skill/agent fetches.
   *
   * Accepts: PAT (classic/fine-grained), GitHub App token, or GITHUB_TOKEN.
   * Must have repository read access to the remote skill repo.
   * For GitHub Apps, the app must be installed on the remote repo.
   *
   * Whitespace-only values are treated as unset (useful for CI env vars).
   */
  githubToken?: string;
}
