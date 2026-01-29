/**
 * Exchange temporary code for GitHub App credentials via GitHub API.
 */

export interface AppCredentials {
  id: number;
  slug: string;
  name: string;
  clientId: string;
  clientSecret: string;
  pem: string;
  webhookSecret: string | null;
  htmlUrl: string;
}

export interface ConversionResponse {
  id: number;
  slug: string;
  name: string;
  client_id: string;
  client_secret: string;
  pem: string;
  webhook_secret: string | null;
  html_url: string;
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

  const data = (await response.json()) as ConversionResponse;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    clientId: data.client_id,
    clientSecret: data.client_secret,
    pem: data.pem,
    webhookSecret: data.webhook_secret,
    htmlUrl: data.html_url,
  };
}
