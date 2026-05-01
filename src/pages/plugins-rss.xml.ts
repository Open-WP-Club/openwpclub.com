import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const allItems = await getCollection('plugins');
  const plugins = allItems
    .filter((p) => p.data.category === 'plugin' && p.data.lastPush)
    .sort((a, b) => new Date(b.data.lastPush).getTime() - new Date(a.data.lastPush).getTime())
    .slice(0, 30);

  return rss({
    title: 'Open WP Club - Plugin Updates',
    description: 'Recently updated free, open-source WordPress plugins from Open WP Club.',
    site: context.site!,
    items: plugins.map((plugin) => ({
      title: `${plugin.data.name} ${plugin.data.version && plugin.data.version !== 'N/A' ? `v${plugin.data.version}` : ''} updated`,
      pubDate: new Date(plugin.data.lastPush),
      description: plugin.data.description,
      link: `/plugins/${plugin.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
