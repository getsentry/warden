/**
 * Optional authentication options for remote skill/agent fetches.
 */
export interface RemoteAuthOptions {
  /** GitHub token used for authenticated fetches of private remotes. */
  githubToken?: string;
}
