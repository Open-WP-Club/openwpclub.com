import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { GITHUB_ORG_URL, DISCORD_URL } from '../lib/config';
import freshness from '../data/freshness.json';

export const GET: APIRoute = async () => {
  const plugins = await getCollection('plugins');

  const sorted = plugins.sort((a, b) => {
    if (!a.data.lastPush || !b.data.lastPush) return 0;
    return new Date(b.data.lastPush).getTime() - new Date(a.data.lastPush).getTime();
  });

  const lines: string[] = [
    '# Open WP Club',
    '',
    '> An open community building free WordPress plugins - one problem, one plugin, no paywalls. We keep going through donations and code contributions.',
    '',
    '## Links',
    '',
    '- Website: https://openwpclub.com',
    `- GitHub: ${GITHUB_ORG_URL}`,
    `- Discord: ${DISCORD_URL}`,
    '',
    '## Pages',
    '',
    '- [Home](https://openwpclub.com/)',
    '- [All Plugins](https://openwpclub.com/plugins/)',
    '- [Apps](https://openwpclub.com/apps/)',
    '- [Blog](https://openwpclub.com/blog/)',
    '',
    '## Full Content',
    '',
    '- [llms-full.txt](https://openwpclub.com/llms-full.txt): Complete site content including all plugin READMEs and blog posts',
    '',
    `> Catalog figures are updated monthly. Data as of ${freshness.catalogUpdatedAt.slice(0, 10)}.`,
    '',
    `## Software (${sorted.length})`,
    '',
  ];

  for (const plugin of sorted) {
    const d = plugin.data;
    const meta: string[] = [];
    if (d.version) meta.push(`v${d.version}`);
    if (d.language) meta.push(d.language);
    if (d.stars > 0) meta.push(`${d.stars} stars`);
    if (d.license) meta.push(d.license);

    const section = d.category === 'app' ? 'apps' : 'plugins';
    lines.push(`- [${d.name}](https://openwpclub.com/${section}/${plugin.id}/): ${d.description}${meta.length ? ' (' + meta.join(', ') + ')' : ''}`);
  }

  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
