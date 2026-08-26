import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteImageUrls, fetchRepoStats, fetchReadme } from '../fetchGitHubData';

describe('rewriteImageUrls', () => {
  it('rewrites relative image src to raw GitHub URL', () => {
    const html = '<img src="screenshot.png" alt="demo">';
    const result = rewriteImageUrls(html, 'my-plugin', 'main');
    expect(result).toBe(
      '<img src="https://raw.githubusercontent.com/Open-WP-Club/my-plugin/main/screenshot.png" alt="demo">'
    );
  });

  it('strips leading ./ from relative paths', () => {
    const html = '<img src="./assets/logo.png">';
    const result = rewriteImageUrls(html, 'test-repo', 'develop');
    expect(result).toBe(
      '<img src="https://raw.githubusercontent.com/Open-WP-Club/test-repo/develop/assets/logo.png">'
    );
  });

  it('leaves absolute URLs unchanged', () => {
    const html = '<img src="https://example.com/photo.jpg">';
    const result = rewriteImageUrls(html, 'repo', 'main');
    expect(result).toBe('<img src="https://example.com/photo.jpg">');
  });

  it('leaves http URLs unchanged', () => {
    const html = '<img src="http://example.com/photo.jpg">';
    const result = rewriteImageUrls(html, 'repo', 'main');
    expect(result).toBe('<img src="http://example.com/photo.jpg">');
  });

  it('handles multiple images in one HTML string', () => {
    const html = '<img src="a.png"><p>text</p><img src="b.png">';
    const result = rewriteImageUrls(html, 'repo', 'main');
    expect(result).toContain('raw.githubusercontent.com/Open-WP-Club/repo/main/a.png');
    expect(result).toContain('raw.githubusercontent.com/Open-WP-Club/repo/main/b.png');
  });

  it('returns html unchanged when there are no images', () => {
    const html = '<p>No images here</p>';
    expect(rewriteImageUrls(html, 'repo', 'main')).toBe(html);
  });

  it('rewrites relative README links to their GitHub repository', () => {
    const html = '<a href="CHANGELOG.md">Changelog</a><a href="/issues">Issues</a><a href="#setup">Setup</a>';
    expect(rewriteImageUrls(html, 'repo', 'main')).toBe(
      '<a href="https://github.com/Open-WP-Club/repo/blob/main/CHANGELOG.md">Changelog</a>' +
      '<a href="https://github.com/Open-WP-Club/repo/issues">Issues</a>' +
      '<a href="#setup">Setup</a>'
    );
  });
});

describe('fetchRepoStats', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed stats from GitHub API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
        pushed_at: '2024-01-15T10:00:00Z',
        created_at: '2023-06-01T00:00:00Z',
        topics: ['wordpress', 'plugin'],
        license: { spdx_id: 'MIT' },
        language: 'PHP',
        default_branch: 'main',
      }),
    }));

    const stats = await fetchRepoStats('my-plugin');
    expect(stats.stars).toBe(42);
    expect(stats.forks).toBe(7);
    expect(stats.openIssues).toBe(3);
    expect(stats.language).toBe('PHP');
    expect(stats.license).toBe('MIT');
    expect(stats.topics).toEqual(['wordpress', 'plugin']);
    expect(stats.defaultBranch).toBe('main');
  });

  it('returns defaults when API returns error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const stats = await fetchRepoStats('nonexistent');
    expect(stats.stars).toBe(0);
    expect(stats.forks).toBe(0);
    expect(stats.topics).toEqual([]);
    expect(stats.license).toBeNull();
    expect(stats.defaultBranch).toBe('main');
  });

  it('handles missing fields with nullish coalescing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));

    const stats = await fetchRepoStats('sparse-repo');
    expect(stats.stars).toBe(0);
    expect(stats.forks).toBe(0);
    expect(stats.language).toBeNull();
    expect(stats.license).toBeNull();
  });
});

describe('fetchReadme', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fallback HTML when readme is not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const html = await fetchReadme('no-readme-repo');
    expect(html).toContain('No README available');
  });

  it('decodes base64 content and converts markdown to HTML', async () => {
    const markdown = '# Hello World\n\nThis is a test.';
    const base64 = Buffer.from(markdown).toString('base64');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: base64 }),
    }));

    const html = await fetchReadme('test-repo');
    expect(html).toContain('<h1>');
    expect(html).toContain('Hello World');
    expect(html).toContain('This is a test.');
  });
});
