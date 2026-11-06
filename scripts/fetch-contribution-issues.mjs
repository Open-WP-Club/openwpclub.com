import { writeFile, rename } from 'node:fs/promises';

const labels = ['good first issue', 'documentation', 'help wanted', 'testing'];
const headers = { 'User-Agent': 'open-wp-club-site', Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const results = await Promise.all(labels.map(async (label) => {
  const query = `org:Open-WP-Club is:issue is:open label:"${label}"`;
  const response = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=30`, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GitHub issue search failed: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.items) || data.incomplete_results) throw new Error('GitHub issue search returned incomplete results');
  return data.items.filter((issue) => !issue.pull_request && !issue.assignee).map((issue) => ({
    title: issue.title, url: issue.html_url, repo: issue.repository_url.split('/').pop(),
    labels: issue.labels.map((item) => item.name).filter((name) => labels.includes(name.toLowerCase())),
    updated: issue.updated_at,
  }));
}));
const unique = new Map(results.flat().filter((issue) => typeof issue.title === 'string' && /^https:\/\/github\.com\/Open-WP-Club\/[\w.-]+\/issues\/\d+$/i.test(issue.url)).map((issue) => [issue.url, issue]));
const items = [...unique.values()].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6).map(({ updated, ...issue }) => issue);
const path = 'src/data/contribution-issues.json';
await writeFile(`${path}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2) + '\n');
await rename(`${path}.tmp`, path);
console.log(`Saved ${items.length} contribution opportunities`);
