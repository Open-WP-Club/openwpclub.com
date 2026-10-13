/** Validate the release shape before touching any published dataset. */
export function parseRelease(repo, release, category) {
  if (!release || typeof release.tag_name !== 'string' || !release.tag_name || typeof release.published_at !== 'string' || !Number.isFinite(Date.parse(release.published_at)) || !Array.isArray(release.assets)) throw new Error(`Invalid release response for ${repo}`);
  if (release.draft || release.prerelease) throw new Error(`Latest stable release response was not stable: ${repo}`);
  if (typeof release.html_url !== 'string' || !release.html_url.startsWith('https://github.com/')) throw new Error(`Invalid release URL for ${repo}`);
  const assets = release.assets.map((asset) => {
    if (typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string' || !asset.browser_download_url.startsWith('https://') || !Number.isFinite(asset.size) || !Number.isFinite(asset.download_count)) throw new Error(`Invalid release asset for ${repo}`);
    return { name: asset.name, url: asset.browser_download_url, size: asset.size, downloadCount: asset.download_count, contentType: asset.content_type || 'application/octet-stream' };
  });
  return {
    repo: repo.toLowerCase(), name: release.name || release.tag_name,
    version: release.tag_name.replace(/^v/i, ''), publishedAt: release.published_at,
    url: release.html_url, notes: release.body || '', category,
    assets, downloads: assets.reduce((total, asset) => total + asset.downloadCount, 0),
  };
}

/** Apply the same verified release to cards, downloads, and the changelog. */
export function synchronizeReleases(plugins, releases) {
  const byRepo = new Map(releases.map((release) => [release.repo, release]));
  return plugins.map((plugin) => {
    const release = byRepo.get(plugin.id.toLowerCase());
    if (!release) return plugin;
    return { ...plugin, version: release.version, releasePublishedAt: release.publishedAt,
      releaseUrl: release.url, releaseAssets: release.assets, releaseDownloads: release.downloads };
  });
}
