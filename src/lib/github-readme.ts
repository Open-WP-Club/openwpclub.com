/** Fetch Markdown using GitHub's canonical path, with case-sensitive raw fallbacks. */
export async function fetchReadmeMarkdown(repo: string, branch: string, options: {
  request?: typeof fetch;
  headers?: HeadersInit;
  apiResult?: { data: unknown; status: number } | null;
  org?: string;
} = {}): Promise<string | null> {
  const request = options.request ?? fetch;
  const org = options.org ?? 'Open-WP-Club';
  let result = options.apiResult;
  if (result === undefined) {
    try {
      const response = await request(`https://api.github.com/repos/${org}/${encodeURIComponent(repo)}/readme`, { headers: options.headers, signal: AbortSignal.timeout(15000) });
      result = { status: response.status, data: response.ok ? await response.json() : null };
    } catch { result = null; }
  }
  if (result && [200, 304].includes(result.status) && result.data && typeof result.data === 'object') {
    const data = result.data as { content?: unknown; encoding?: string };
    if (typeof data.content === 'string' && data.encoding !== 'none') return Buffer.from(data.content, 'base64').toString('utf8');
  }
  let uncertain = !result || result.status !== 404;
  for (const name of ['README.md', 'readme.md', 'README.MD']) {
    try {
      const response = await request(`https://raw.githubusercontent.com/${org}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${name}`, { signal: AbortSignal.timeout(15000) });
      if (response.ok) return await response.text();
      if (response.status !== 404) uncertain = true;
    } catch { uncertain = true; }
  }
  if (uncertain) throw new Error(`README refresh failed for ${repo}; retaining the last successful snapshot`);
  return null; // Confirmed absence is different from an unavailable source.
}
