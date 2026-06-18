/**
 * Fetches plugin + contributor data from GitHub and saves to src/data/.
 * Run with: pnpm run fetch-data
 *
 * Saves:
 *   src/data/plugins.json      - CSV + GitHub stats + README for each plugin
 *   src/data/contributors.json - aggregated contributors across all repos
 *
 * The Astro content collection loader reads these files at build time
 * instead of hitting the GitHub API again.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { parseCSVLine } from '../src/lib/csv';
import { rewriteImageUrls } from '../src/lib/fetchGitHubData';
import { categorize } from '../src/lib/categorize';

// Resolve paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'src/data');
const READMES_DIR = resolve(DATA_DIR, 'readmes');
const CACHE_FILE = resolve(ROOT, '.fetch-cache.json');

// Load .env file
try {
  const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* .env not found - fine */ }

const ORG = 'Open-WP-Club';
const CSV_URL = `https://raw.githubusercontent.com/${ORG}/.github/main/plugins.csv`;
const BATCH_SIZE = 10;
const TOKEN = process.env.GITHUB_TOKEN || '';

/** Known AI/LLM account logins - excluded from contributors unless they are sponsors. */
const AI_LOGINS = new Set(['claude', 'copilot', 'github-copilot', 'devin-ai', 'coderabbitai', 'sweep-ai']);

interface Sponsor { login: string; name: string; url: string; avatarUrl: string; tier: string; description: string; since: string; }

function loadSponsorLogins(): Set<string> {
  try {
    const sponsors: Sponsor[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'sponsors.json'), 'utf-8'));
    return new Set(sponsors.map((s) => s.login));
  } catch { return new Set(); }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'open-wp-club-site' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

// ---------------------------------------------------------------------------
// ETag cache - conditional requests (304) don't count against GitHub rate limit
// ---------------------------------------------------------------------------
interface CacheEntry { etag: string; data: unknown }
type ETagCache = Record<string, CacheEntry>;

let etagCache: ETagCache = {};
let cacheHits = 0;
let cacheMisses = 0;

function loadCache(): void {
  if (!existsSync(CACHE_FILE)) return;
  try {
    etagCache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch { etagCache = {}; }
}

function saveCache(): void {
  writeFileSync(CACHE_FILE, JSON.stringify(etagCache));
}

/**
 * Fetch with ETag caching. On 304 (Not Modified) returns cached data
 * without consuming a GitHub API rate-limit point.
 */
async function cachedFetch(url: string): Promise<{ data: unknown; status: number } | null> {
  const h = headers();
  const cached = etagCache[url];
  if (cached?.etag) h['If-None-Match'] = cached.etag;

  const res = await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) });

  if (res.status === 304 && cached) {
    cacheHits++;
    return { data: cached.data, status: 304 };
  }

  if (!res.ok) return null;

  cacheMisses++;
  const data = await res.json();
  const etag = res.headers.get('etag');
  if (etag) {
    etagCache[url] = { etag, data };
  }
  return { data, status: res.status };
}


async function fetchRepoStats(repoName: string) {
  const url = `https://api.github.com/repos/${ORG}/${repoName}`;
  const result = await cachedFetch(url);
  if (!result) {
    console.warn(`  Failed: ${repoName}`);
    return { stars: 0, forks: 0, openIssues: 0, lastPush: '', createdAt: '', topics: [] as string[], license: null as string | null, language: null as string | null, defaultBranch: 'main' };
  }
  const d = result.data as Record<string, unknown>;
  return {
    stars: (d.stargazers_count as number) ?? 0,
    forks: (d.forks_count as number) ?? 0,
    openIssues: (d.open_issues_count as number) ?? 0,
    lastPush: (d.pushed_at as string) ?? '',
    createdAt: (d.created_at as string) ?? '',
    topics: (d.topics as string[]) ?? [],
    license: (d.license as Record<string, string>)?.spdx_id ?? null,
    language: (d.language as string) ?? null,
    defaultBranch: (d.default_branch as string) ?? 'main',
  };
}

async function fetchReadme(repoName: string, defaultBranch: string): Promise<string> {
  // Try API first (with ETag cache)
  const url = `https://api.github.com/repos/${ORG}/${repoName}/readme`;
  const result = await cachedFetch(url);
  if (result) {
    const data = result.data as Record<string, string>;
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    let html = await marked.parse(content);
    return rewriteImageUrls(html, repoName, defaultBranch);
  }
  // Fallback: raw file (not rate-limited)
  const rawRes = await fetch(`https://raw.githubusercontent.com/${ORG}/${repoName}/${defaultBranch}/README.md`, { signal: AbortSignal.timeout(15000) });
  if (rawRes.ok) {
    const content = await rawRes.text();
    let html = await marked.parse(content);
    return rewriteImageUrls(html, repoName, defaultBranch);
  }
  return '<p class="text-gray-500 italic">No README available for this plugin.</p>';
}

function sanitizeReadme(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'details', 'summary', 'picture', 'source', 'video']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      a: ['href', 'title', 'target', 'rel'],
      code: ['class'],
      span: ['class'],
      pre: ['class'],
      div: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

async function main() {
  console.log('--- Open WP Club Data Fetch ---\n');

  loadCache();
  const cachedEntries = Object.keys(etagCache).length;
  if (cachedEntries > 0) console.log(`Loaded ${cachedEntries} cached ETags from .fetch-cache.json\n`);

  // Check rate limit
  console.log('Checking GitHub API rate limit...');
  const rateRes = await fetch('https://api.github.com/rate_limit', { headers: headers(), signal: AbortSignal.timeout(10000) });
  if (rateRes.ok) {
    const rate = await rateRes.json();
    const { remaining, limit, reset } = rate.resources.core;
    const resetTime = new Date(reset * 1000).toLocaleTimeString();
    console.log(`  API: ${remaining}/${limit} requests remaining (resets at ${resetTime})`);
    if (!TOKEN) console.log('  (no GITHUB_TOKEN set - limited to 60 req/hr)');
    if (remaining < 50) console.log('  WARNING: Low API requests remaining.');
  }
  console.log();

  // Fetch CSV
  console.log('Fetching plugin list from CSV...');
  const csvRes = await fetch(CSV_URL, { signal: AbortSignal.timeout(15000) });
  if (!csvRes.ok) { console.error(`  FAILED: HTTP ${csvRes.status}`); process.exit(1); }
  const text = await csvRes.text();
  const lines = text.trim().split(/\r?\n/);
  const csvHeaders = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

  interface CSVPlugin { name: string; description: string; version: string; downloads: string; rating: string; github_url: string; wordpress_url: string; slug: string; }
  const csvPlugins: CSVPlugin[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;
    const row: Record<string, string> = {};
    csvHeaders.forEach((h, idx) => { row[h] = values[idx] || ''; });
    const name = row.name || row.plugin_name || row.title || values[0];
    if (!name?.trim()) continue;
    const description = row.description || row.desc || row.short_description || values[1];
    const slug = row.slug || row.plugin_slug || name.trim().toLowerCase().replace(/\s+/g, '-');
    csvPlugins.push({
      name: name.trim(),
      description: description?.trim() || 'WordPress plugin by Open WP Club',
      version: row.version || row.ver || '',
      downloads: row.downloads || row.download_count || '',
      rating: row.rating || row.stars || '',
      github_url: row.github_url || row.github || row.repo_url || '',
      wordpress_url: row.wordpress_url || row.wp_url || row.plugin_url || '',
      slug,
    });
  }
  console.log(`  Found ${csvPlugins.length} plugins in CSV\n`);

  // Fetch GitHub data for each plugin
  console.log('Fetching GitHub data (stats + README)...');
  let totalStars = 0, totalForks = 0, failedCount = 0;

  const pluginData: Array<Record<string, unknown>> = [];

  for (let i = 0; i < csvPlugins.length; i += BATCH_SIZE) {
    const batch = csvPlugins.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const stats = await fetchRepoStats(p.slug);
        const readmeHtml = await fetchReadme(p.slug, stats.defaultBranch);
        return { csv: p, stats, readmeHtml };
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { csv, stats, readmeHtml } = r.value;
        totalStars += stats.stars;
        totalForks += stats.forks;
        if (stats.stars === 0 && stats.lastPush === '') failedCount++;
        const category = categorize(stats.topics, stats.language, csv.slug);
        pluginData.push({
          id: csv.slug,
          name: csv.name,
          description: csv.description,
          version: csv.version,
          downloads: csv.downloads,
          rating: csv.rating,
          githubUrl: csv.github_url || `https://github.com/${ORG}/${csv.slug}`,
          wordpressUrl: csv.wordpress_url,
          stars: stats.stars,
          forks: stats.forks,
          openIssues: stats.openIssues,
          lastPush: stats.lastPush,
          createdAt: stats.createdAt,
          topics: stats.topics,
          license: stats.license,
          language: stats.language,
          defaultBranch: stats.defaultBranch,
          category,
          _readmeHtml: readmeHtml,
        });
      }
    }
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, csvPlugins.length)}/${csvPlugins.length} repos done\r`);
  }
  console.log();
  console.log(`  Stars: ${totalStars} | Forks: ${totalForks}`);
  if (failedCount > 0) console.warn(`  Failed: ${failedCount} repos`);
  console.log();

  // Fetch contributors
  console.log('Fetching contributors...');
  const sponsorLogins = loadSponsorLogins();
  const contributorMap = new Map<string, { login: string; contributions: number; profileUrl: string }>();
  const perRepoContributors = new Map<string, Array<{ login: string; avatar: string; profileUrl: string; contributions: number }>>();
  for (let i = 0; i < csvPlugins.length; i += BATCH_SIZE) {
    const batch = csvPlugins.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const url = `https://api.github.com/repos/${ORG}/${p.slug}/contributors?per_page=100`;
        const result = await cachedFetch(url);
        const data = result ? result.data as Array<{ login: string; contributions: number; html_url: string; avatar_url: string; type: string }> : [];
        return { slug: p.slug, data };
      })
    );
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { slug, data } = r.value;
      const repoContribs: Array<{ login: string; avatar: string; profileUrl: string; contributions: number }> = [];
      for (const c of data) {
        if (c.type === 'Bot') continue;
        // Filter AI accounts unless they are sponsors
        if (AI_LOGINS.has(c.login) && !sponsorLogins.has(c.login)) continue;
        repoContribs.push({ login: c.login, avatar: c.avatar_url, profileUrl: c.html_url, contributions: c.contributions });
        const existing = contributorMap.get(c.login);
        if (existing) {
          existing.contributions += c.contributions;
        } else {
          contributorMap.set(c.login, { login: c.login, contributions: c.contributions, profileUrl: c.html_url });
        }
      }
      perRepoContributors.set(slug, repoContribs);
    }
  }
  const contributors = Array.from(contributorMap.values()).sort((a, b) => b.contributions - a.contributions);
  console.log(`  Found ${contributors.length} unique contributors\n`);

  // Fetch changelog from GitHub releases
  console.log('Fetching changelog from GitHub releases...');
  interface GitHubRelease { tag_name: string; name: string; published_at: string; body: string; draft: boolean; prerelease: boolean; }
  const releasesResult = await cachedFetch(`https://api.github.com/repos/${ORG}/www/releases?per_page=30`);
  const releases: GitHubRelease[] = releasesResult
    ? (releasesResult.data as GitHubRelease[]).filter((r) => !r.draft && !r.prerelease)
    : [];

  if (releases.length > 0) {
    const changelog = [...releases].reverse().map((r) => {
      const date = new Date(r.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const items = (r.body || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('- ') || l.startsWith('* '))
        .map((l) => l.slice(2).trim())
        .filter(Boolean);
      return { date, title: r.name || r.tag_name, items: items.length > 0 ? items : [`Release ${r.tag_name}`] };
    });
    writeFileSync(resolve(DATA_DIR, 'changelog.json'), JSON.stringify(changelog, null, 2));
    console.log(`  Saved ${changelog.length} releases to changelog.json\n`);
  } else {
    console.log('  No releases found - keeping existing changelog.json\n');
  }

  // Fetch GitHub Sponsors
  console.log('Fetching GitHub Sponsors...');
  if (TOKEN) {
    const sponsorsQuery = `query {
      organization(login: "${ORG}") {
        sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
          nodes {
            sponsorEntity {
              ... on User { login name avatarUrl url }
              ... on Organization { login name avatarUrl url }
            }
            tier { monthlyPriceInDollars name }
            createdAt
          }
        }
      }
    }`;
    const gqlRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sponsorsQuery }),
      signal: AbortSignal.timeout(15000),
    });
    if (gqlRes.ok) {
      const gqlData = await gqlRes.json() as { data?: { organization?: { sponsorshipsAsMaintainer?: { nodes?: Array<{ sponsorEntity: { login: string; name: string; avatarUrl: string; url: string } | null; tier: { monthlyPriceInDollars: number; name: string } | null; createdAt: string }> } } } } };
      const nodes = gqlData.data?.organization?.sponsorshipsAsMaintainer?.nodes ?? [];
      if (nodes.length > 0) {
        const sponsors: Sponsor[] = nodes
          .filter((n) => n.sponsorEntity)
          .map((n) => {
            const entity = n.sponsorEntity!;
            const price = n.tier?.monthlyPriceInDollars ?? 0;
            const tier = price >= 100 ? 'gold' : price >= 25 ? 'silver' : 'bronze';
            return {
              login: entity.login,
              name: entity.name || entity.login,
              url: entity.url,
              avatarUrl: entity.avatarUrl,
              tier,
              description: n.tier?.name ?? '',
              since: n.createdAt,
            };
          });
        writeFileSync(resolve(DATA_DIR, 'sponsors.json'), JSON.stringify(sponsors, null, 2));
        console.log(`  Saved ${sponsors.length} sponsors to sponsors.json\n`);
      } else {
        console.log('  No active sponsors found\n');
      }
    } else {
      console.warn(`  GitHub Sponsors API failed: ${gqlRes.status}\n`);
    }
  } else {
    console.log('  Skipped (no GITHUB_TOKEN)\n');
  }

  // Save to disk
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(READMES_DIR, { recursive: true });

  // Write per-plugin sanitized README HTML files
  for (const p of pluginData) {
    const html = sanitizeReadme(p._readmeHtml as string);
    writeFileSync(resolve(READMES_DIR, `${p.id}.html`), html);
  }

  // Strip internal _readmeHtml field before writing plugins.json
  const cleanData = pluginData.map(({ _readmeHtml, ...rest }) => rest);
  writeFileSync(resolve(DATA_DIR, 'plugins.json'), JSON.stringify(cleanData, null, 2));
  writeFileSync(resolve(DATA_DIR, 'contributors.json'), JSON.stringify(contributors, null, 2));

  // Save per-repo contributor data
  const repoContribData = Object.fromEntries(perRepoContributors);
  writeFileSync(resolve(DATA_DIR, 'repo-contributors.json'), JSON.stringify(repoContribData, null, 2));

  // Save ETag cache for next run
  saveCache();

  const cats = pluginData.reduce((acc, p) => { const c = p.category as string; acc[c] = (acc[c] || 0) + 1; return acc; }, {} as Record<string, number>);
  console.log('=== Saved ===');
  console.log(`  src/data/plugins.json       (${cleanData.length} repos: ${Object.entries(cats).map(([k,v]) => `${v} ${k}s`).join(', ')})`);
  console.log(`  src/data/readmes/           (${cleanData.length} README HTML files)`);
  console.log(`  src/data/contributors.json  (${contributors.length} contributors)`);
  console.log(`  src/data/repo-contributors.json (per-repo contributor data)`);
  console.log();
  console.log(`Cache: ${cacheHits} hits (304) / ${cacheMisses} misses (200) - ${cacheHits + cacheMisses} total API calls`);
  if (cacheHits > 0) console.log(`  ${cacheHits} requests served from cache (did not count against rate limit)`);
  console.log();
  console.log('Run "pnpm run build" to build the site with this data.');
  console.log();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
