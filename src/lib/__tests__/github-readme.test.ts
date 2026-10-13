import { describe, expect, it } from 'vitest';
import { fetchReadmeMarkdown } from '../github-readme';

describe('case-sensitive README fallback and failure semantics', () => {
  it.each(['readme.md', 'README.MD'])('finds %s when the API is unavailable', async (name) => {
    const request = async (url: string | URL | Request) => String(url).endsWith('/' + name) ? new Response('# Actual documentation') : new Response('', { status: 404 });
    expect(await fetchReadmeMarkdown('plugin', 'master', { request: request as typeof fetch, apiResult: { data: null, status: 503 } })).toBe('# Actual documentation');
  });
  it('falls back after an API timeout and preserves genuine missing-file distinction', async () => {
    const request = async (url: string | URL | Request) => {
      if (String(url).includes('api.github.com')) throw new Error('timeout');
      return new Response('# Raw content');
    };
    expect(await fetchReadmeMarkdown('plugin', 'main', { request: request as typeof fetch })).toBe('# Raw content');
    expect(await fetchReadmeMarkdown('plugin', 'main', { request: (async () => new Response('', { status: 404 })) as typeof fetch })).toBeNull();
  });
  it('never replaces documentation with a placeholder when sources are down', async () => {
    await expect(fetchReadmeMarkdown('plugin', 'main', { request: (async () => new Response('', { status: 503 })) as typeof fetch })).rejects.toThrow('retaining');
  });
});
