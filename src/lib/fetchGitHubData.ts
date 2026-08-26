import { marked } from 'marked';
import type { GitHubRepoStats } from './types';
import { ORG, BATCH_SIZE, AI_LOGINS } from './config';
import type { Sponsor } from './types';
import { readFileSync, existsSync } from 'node:fs';

const GITHUB_TOKEN = import.meta.env?.GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';

function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'open-wp-club-site',
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

export async function fetchRepoStats(repoName: string): Promise<GitHubRepoStats> {
  const url = `https://api.github.com/repos/${ORG}/${repoName}`;
  const res = await fetch(url, { headers: githubHeaders(), signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    console.warn(`Failed to fetch stats for ${repoName}: ${res.status}`);
    return {
      stars: 0,
      forks: 0,
      openIssues: 0,
      lastPush: '',
      createdAt: '',
      topics: [],
      license: null,
      language: null,
      defaultBranch: 'main',
    };
  }

  const data = await res.json();
  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    lastPush: data.pushed_at ?? '',
    createdAt: data.created_at ?? '',
    topics: data.topics ?? [],
    license: data.license?.spdx_id ?? null,
    language: data.language ?? null,
    defaultBranch: data.default_branch ?? 'main',
  };
}

export async function fetchReadme(repoName: string, defaultBranch: string = 'main'): Promise<string> {
  // Try the GitHub API first
  const url = `https://api.github.com/repos/${ORG}/${repoName}/readme`;
  const res = await fetch(url, { headers: githubHeaders(), signal: AbortSignal.timeout(15000) });

  if (res.ok) {
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    let html = await marked.parse(content);
    html = rewriteImageUrls(html, repoName, defaultBranch);
    return html;
  }

  // Fallback: fetch raw README directly (not rate-limited like the API)
  const rawUrl = `https://raw.githubusercontent.com/${ORG}/${repoName}/${defaultBranch}/README.md`;
  const rawRes = await fetch(rawUrl, { signal: AbortSignal.timeout(15000) });

  if (rawRes.ok) {
    const content = await rawRes.text();
    let html = await marked.parse(content);
    html = rewriteImageUrls(html, repoName, defaultBranch);
    return html;
  }

  return '<p class="text-gray-500 italic">No README available for this plugin.</p>';
}

export function rewriteImageUrls(html: string, repo: string, branch: string): string {
  const withImages = html.replace(
    /(<img\s[^>]*src=")(?!https?:\/\/)([^"]+)(")/gi,
    (_, prefix, src, suffix) => {
      const cleanSrc = src.replace(/^\.\//, '');
      return `${prefix}https://raw.githubusercontent.com/${ORG}/${repo}/${branch}/${cleanSrc}${suffix}`;
    }
  );

  return withImages.replace(
    /(<a\s[^>]*href=")(?!https?:\/\/|mailto:|#)([^"]+)(")/gi,
    (_, prefix, href, suffix) => {
      if (href === '/issues' || href === 'issues') return `${prefix}https://github.com/${ORG}/${repo}/issues${suffix}`;
      const cleanHref = href.replace(/^\.\//, '').replace(/^\//, '');
      return `${prefix}https://github.com/${ORG}/${repo}/blob/${branch}/${cleanHref}${suffix}`;
    }
  );
}

export interface Contributor {
  login: string;
  contributions: number;
  profileUrl: string;
}

/** Load sponsor logins so AI accounts that are sponsors can stay in contributors. */
function loadSponsorLogins(): Set<string> {
  const path = 'src/data/sponsors.json';
  if (!existsSync(path)) return new Set();
  const sponsors: Sponsor[] = JSON.parse(readFileSync(path, 'utf-8'));
  return new Set(sponsors.map((s) => s.login));
}

// Module-level cache so contributors are fetched once per build
let _contributorCache: Contributor[] | null = null;
let _contributorCacheKey: string | null = null;

export async function fetchOrgContributors(repoNames: string[]): Promise<Contributor[]> {
  const cacheKey = repoNames.slice().sort().join(',');
  if (_contributorCache && _contributorCacheKey === cacheKey) {
    return _contributorCache;
  }

  const sponsorLogins = loadSponsorLogins();
  const contributorMap = new Map<string, Contributor>();

  for (let i = 0; i < repoNames.length; i += BATCH_SIZE) {
    const batch = repoNames.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (repo) => {
        const url = `https://api.github.com/repos/${ORG}/${repo}/contributors?per_page=100`;
        const res = await fetch(url, { headers: githubHeaders(), signal: AbortSignal.timeout(15000) });
        if (!res.ok) return [];
        return (await res.json()) as Array<{ login: string; contributions: number; html_url: string; type: string }>;
      })
    );

    for (const result of batchResults) {
      if (result.status !== 'fulfilled') continue;
      for (const c of result.value) {
        if (c.type === 'Bot') continue;
        // Filter AI accounts unless they are sponsors
        if (AI_LOGINS.has(c.login) && !sponsorLogins.has(c.login)) continue;
        const existing = contributorMap.get(c.login);
        if (existing) {
          existing.contributions += c.contributions;
        } else {
          contributorMap.set(c.login, {
            login: c.login,
            contributions: c.contributions,
            profileUrl: c.html_url,
          });
        }
      }
    }
  }

  const result = Array.from(contributorMap.values()).sort((a, b) => b.contributions - a.contributions);
  _contributorCache = result;
  _contributorCacheKey = cacheKey;
  return result;
}

export async function fetchAllGitHubData(
  repoNames: string[]
): Promise<Map<string, { stats: GitHubRepoStats; readmeHtml: string }>> {
  const results = new Map<string, { stats: GitHubRepoStats; readmeHtml: string }>();

  for (let i = 0; i < repoNames.length; i += BATCH_SIZE) {
    const batch = repoNames.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (name) => {
        const stats = await fetchRepoStats(name);
        const readmeHtml = await fetchReadme(name, stats.defaultBranch);
        return { name, stats, readmeHtml };
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.name, {
          stats: result.value.stats,
          readmeHtml: result.value.readmeHtml,
        });
      }
    }
  }

  return results;
}
