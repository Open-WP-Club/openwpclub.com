import type { CollectionEntry } from 'astro:content';

export function getPluginBadgeThresholds(allPlugins: CollectionEntry<'plugins'>[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const starThreshold =
    allPlugins.length > 0
      ? ([...allPlugins].sort((a, b) => b.data.stars - a.data.stars)[
          Math.min(4, allPlugins.length - 1)
        ]?.data.stars ?? 0)
      : 0;
  return { thirtyDaysAgo, starThreshold };
}

export function pluginIsNew(lastPush: string, thirtyDaysAgo: Date): boolean {
  return new Date(lastPush) > thirtyDaysAgo;
}

export function pluginIsPopular(stars: number, starThreshold: number): boolean {
  return stars >= starThreshold && starThreshold > 0;
}
