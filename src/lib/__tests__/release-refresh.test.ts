import { describe, expect, it } from 'vitest';
import { parseRelease, synchronizeReleases } from '../../../scripts/release-refresh.mjs';
const response = { tag_name: 'v2.0.0', published_at: '2026-10-13T12:00:00Z', html_url: 'https://github.com/Open-WP-Club/app/releases/tag/v2.0.0', assets: [{ name: 'app.dmg', browser_download_url: 'https://github.com/Open-WP-Club/app/releases/download/v2.0.0/app.dmg', size: 123, download_count: 4, content_type: 'application/octet-stream' }] };
describe('release synchronization', () => {
  it('updates version and actual installer links together without losing curated metadata', () => {
    const release = parseRelease('APP', response, 'app');
    const before = [{ id: 'app', version: '1.0.0', description: 'Curated', screenshots: ['keep'], releaseAssets: ['old'] }, { id: 'other', version: '1.0.0' }];
    const updated = synchronizeReleases(before, [release]);
    expect(updated[0]).toMatchObject({ version: '2.0.0', description: 'Curated', screenshots: ['keep'], releaseDownloads: 4 });
    expect(updated[0].releaseAssets[0].url).toContain('/v2.0.0/app.dmg');
    expect(updated[1]).toEqual(before[1]);
  });
  it('updates installer data even when a release tag has not changed', () => {
    const release = parseRelease('app', response, 'app');
    const updated = synchronizeReleases([{ id: 'app', version: '2.0.0', releaseAssets: [] }], [release]);
    expect(updated[0].releaseAssets).toHaveLength(1);
  });
  it('rejects malformed release/asset responses before snapshots can be written', () => {
    expect(() => parseRelease('app', {}, 'app')).toThrow();
    expect(() => parseRelease('app', { ...response, assets: [{ ...response.assets[0], browser_download_url: 'javascript:alert(1)' }] }, 'app')).toThrow();
  });
});
