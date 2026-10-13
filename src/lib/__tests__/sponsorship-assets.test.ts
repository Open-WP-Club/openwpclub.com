import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { bannerNameLines, buildSponsorshipFeed, normalizeSponsorLogo, renderSponsorshipBanner } from '../sponsorship-assets';
import registry from '../../data/sponsorship.json';

describe('sponsor assets and consumer compatibility', () => {
  it('normalizes a large PNG to the catalog byte and dimension limits', async () => {
    const original = await sharp({ create: { width: 2500, height: 1500, channels: 4, background: '#112233' } }).png().toBuffer();
    const png = await normalizeSponsorLogo(original);
    const metadata = await sharp(png).metadata();
    expect(metadata.width).toBeLessThanOrEqual(192);
    expect(metadata.height).toBeLessThanOrEqual(96);
    expect(`data:image/png;base64,${png.toString('base64')}`.length).toBeLessThanOrEqual(65536);
  });
  it('rejects non-PNG and oversized uploaded files before publishing', async () => {
    const jpg = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#eeeeee' } }).jpeg().toBuffer();
    await expect(normalizeSponsorLogo(jpg)).rejects.toThrow('PNG');
    await expect(normalizeSponsorLogo(Buffer.alloc(6 * 1024 * 1024))).rejects.toThrow('5 MiB');
  });
  it('keeps short names intact and clearly truncates long Unicode names', () => {
    expect(bannerNameLines('MGKNeT')).toEqual(['MGKNeT']);
    const lines = bannerNameLines('A very long company name repeated '.repeat(8));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
    const unicode = bannerNameLines('株式会社会社名'.repeat(20));
    expect(unicode).toHaveLength(2);
    expect(unicode[1]).toMatch(/…$/);
  });
  it('renders three bounded positions with long names', async () => {
    const entries = [0, 1, 2].map((i) => ({ ...registry.supporters[0], tier: 'partner' as const, id: `test-${i}`, name: 'A long advertiser company name '.repeat(7) }));
    const png = await renderSponsorshipBanner('supporters', undefined, entries);
    expect(await sharp(png).metadata()).toMatchObject({ width: 960, height: 240 });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0); // Transparent canvas.
    expect(data[(105 * info.width + 30) * 4 + 3]).toBe(0); // Former card background.
    const dark = await renderSponsorshipBanner('supporters', undefined, entries, 'dark');
    expect(dark.equals(png)).toBe(false);
  });
  it('keeps name-only Supporter credits out of the Hub feed', async () => {
    const data = { ...registry, supporters: [...registry.supporters, { ...registry.supporters[0], id: 'basic', tier: 'supporter', logo: undefined }] };
    const feed = await buildSponsorshipFeed(Date.parse('2026-10-15T00:00:00Z'), data);
    expect(feed.supporters.map((entry) => entry.id)).toEqual(['mgknet']);
  });
  it('embeds the approved tier and a bounded PNG in the public feed', async () => {
    const feed = await buildSponsorshipFeed(Date.parse('2026-10-15T00:00:00Z'));
    expect(feed.supporters[0].tier).toBe('partner');
    expect(feed.supporters[0].logoData.length).toBeLessThanOrEqual(65536);
    expect(Buffer.byteLength(JSON.stringify(feed))).toBeLessThanOrEqual(262144);
  });
});
