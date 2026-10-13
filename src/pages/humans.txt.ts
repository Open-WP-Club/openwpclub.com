import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import contributors from '../data/contributors.json';
import { GITHUB_ORG_URL } from '../lib/config';

export const GET: APIRoute = async () => {
  const plugins = await getCollection('plugins');

  const lines: string[] = [
    '/* TEAM */',
    '',
  ];

  for (const c of contributors) {
    lines.push(`  Name: ${c.login}`);
    lines.push(`  GitHub: ${c.profileUrl}`);
    lines.push(`  Contributions: ${c.contributions}`);
    lines.push('');
  }

  if (contributors.length === 0) {
    lines.push('  (contributor data temporarily unavailable)');
    lines.push('');
  }

  lines.push('/* SITE */');
  lines.push('');
  // Use most recent plugin push date instead of build date
  const lastPush = plugins
    .map((p) => p.data.lastPush)
    .filter(Boolean)
    .sort()
    .pop();
  lines.push('  Last update: ' + (lastPush ? new Date(lastPush).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]));
  lines.push('  Language: English');
  lines.push('  Standards: HTML5, CSS3');
  lines.push('  Framework: Astro');
  lines.push('  Hosting: GitHub Pages / Cloudflare');
  lines.push(`  Source: ${GITHUB_ORG_URL}`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
