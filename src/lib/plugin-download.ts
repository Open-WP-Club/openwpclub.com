import type { ReleaseAsset } from './app-releases';

/** Labels, ZIP download, WP-CLI and Playground must point at the same release. */
export function pluginDownloadUrl(plugin: { githubUrl: string; defaultBranch: string; releaseUrl?: string; releaseAssets?: ReleaseAsset[] }) {
  const name = plugin.githubUrl.split('/').pop()!.toLowerCase();
  const zipAssets = (plugin.releaseAssets ?? []).filter((asset) => asset.name.toLowerCase().endsWith('.zip') && asset.url.startsWith(plugin.githubUrl + '/releases/download/'));
  const zip = zipAssets.find((asset) => asset.name.toLowerCase() === name + '.zip') ?? zipAssets[0];
  if (zip) return zip.url;
  const releasePrefix = plugin.githubUrl + '/releases/tag/';
  if (plugin.releaseUrl?.startsWith(releasePrefix)) return plugin.githubUrl + '/archive/refs/tags/' + plugin.releaseUrl.slice(releasePrefix.length) + '.zip';
  return plugin.githubUrl + '/archive/refs/heads/' + plugin.defaultBranch + '.zip';
}
