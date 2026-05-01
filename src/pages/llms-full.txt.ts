import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GITHUB_ORG_URL, DISCORD_URL } from '../lib/config';

const READMES_DIR = resolve(process.cwd(), 'src/data/readmes');

function stripHtml(html: string): string {
  return html
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '') // skip code blocks - too noisy
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const GET: APIRoute = async () => {
  const [plugins, posts] = await Promise.all([
    getCollection('plugins'),
    getCollection('blog'),
  ]);

  const sortedPlugins = plugins
    .filter((p) => p.data.category === 'plugin')
    .sort((a, b) => (b.data.stars ?? 0) - (a.data.stars ?? 0));

  const sortedPosts = posts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  const lines: string[] = [
    '# Open WP Club - Full Site Content',
    '',
    '> An open community building free WordPress plugins. No paywalls, no premium tiers.',
    `> Website: https://openwpclub.com | GitHub: ${GITHUB_ORG_URL} | Discord: ${DISCORD_URL}`,
    '',
    '---',
    '',
    `# Plugins (${sortedPlugins.length})`,
    '',
  ];

  for (const plugin of sortedPlugins) {
    const d = plugin.data;
    lines.push(`## ${d.name}`);
    lines.push(`URL: https://openwpclub.com/plugins/${plugin.id}/`);
    lines.push(`GitHub: ${d.githubUrl}`);
    lines.push(`Description: ${d.description}`);

    const meta: string[] = [];
    if (d.version) meta.push(`version: ${d.version}`);
    if (d.language) meta.push(`language: ${d.language}`);
    if (d.stars > 0) meta.push(`stars: ${d.stars}`);
    if (d.license) meta.push(`license: ${d.license}`);
    if (d.downloads) meta.push(`downloads: ${d.downloads}`);
    if (meta.length) lines.push(meta.join(' | '));

    if (d.topics?.length) lines.push(`Topics: ${d.topics.join(', ')}`);

    const readmePath = resolve(READMES_DIR, `${plugin.id}.html`);
    if (existsSync(readmePath)) {
      const html = readFileSync(readmePath, 'utf-8');
      const text = stripHtml(html);
      if (text) {
        lines.push('');
        lines.push(text.slice(0, 3000)); // cap per plugin to keep file size reasonable
        if (text.length > 3000) lines.push('[…truncated]');
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push(`# Blog (${sortedPosts.length})`);
  lines.push('');

  for (const post of sortedPosts) {
    const d = post.data;
    lines.push(`## ${d.title}`);
    lines.push(`URL: https://openwpclub.com/blog/${post.id}/`);
    lines.push(`Date: ${d.date.toISOString().slice(0, 10)}`);
    lines.push(`Author: ${d.author}`);
    if (d.tags?.length) lines.push(`Tags: ${d.tags.join(', ')}`);
    lines.push(`Description: ${d.description}`);
    lines.push('');
    if (post.body) lines.push(post.body.trim());
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
