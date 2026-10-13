import { describe, expect, it } from 'vitest';
import { pluginDownloadUrl } from '../plugin-download';
const plugin = { githubUrl: 'https://github.com/Open-WP-Club/plugin-hub', defaultBranch: 'main', releaseUrl: 'https://github.com/Open-WP-Club/plugin-hub/releases/tag/1.5.1' };
describe('released plugin downloads', () => {
  it('prefers the published plugin ZIP instead of unreleased main code', () => {
    expect(pluginDownloadUrl({ ...plugin, releaseAssets: [{ name: 'plugin-hub.zip', url: 'https://github.com/Open-WP-Club/plugin-hub/releases/download/1.5.1/plugin-hub.zip', size: 10, downloadCount: 1, contentType: 'application/zip' }] })).toBe('https://github.com/Open-WP-Club/plugin-hub/releases/download/1.5.1/plugin-hub.zip');
  });
  it('uses the release tag archive when there is no ZIP asset', () => {
    expect(pluginDownloadUrl(plugin)).toBe('https://github.com/Open-WP-Club/plugin-hub/archive/refs/tags/1.5.1.zip');
  });
  it('keeps a source fallback for plugins without a published release', () => {
    expect(pluginDownloadUrl({ ...plugin, releaseUrl: '' })).toBe('https://github.com/Open-WP-Club/plugin-hub/archive/refs/heads/main.zip');
  });
});
