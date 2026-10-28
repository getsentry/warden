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
export async function exchangeCodeForCredentials(code: string): Promise<AppCredentials> {
  const url = `https://api.github.com/app-manifests/${code}/conversions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for credentials: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = (await response.json()) as {
    id: number;
    name: string;
    pem: string;
    html_url: string;
  };

  return {
    id: data.id,
    name: data.name,
    pem: data.pem,
    htmlUrl: data.html_url,
  };
}
