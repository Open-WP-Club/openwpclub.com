import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import registry from '../data/sponsorship.json';
import { sponsorship, validateSponsorship, campaignsForRepository, hasLogoRecognition, SPONSORSHIP_LIMIT, type SponsorshipEntry } from './sponsorship';

const LOGO_DATA_LIMIT = 65536;
const logoCache = new Map<string, Promise<Buffer>>();

/** Decode, bound and re-encode rather than shipping the original uploaded file. */
export async function normalizeSponsorLogo(input: Buffer) {
  if (input.length > 5 * 1024 * 1024) throw new Error('Sponsor PNG source exceeds 5 MiB');
  const options = { limitInputPixels: 16_000_000 };
  const metadata = await sharp(input, options).metadata();
  if (metadata.format !== 'png' || (metadata.pages ?? 1) !== 1) throw new Error('Sponsor logos must be single-frame PNG images');
  const png = await sharp(input, options).trim().resize(192, 96, { fit: 'inside', withoutEnlargement: true })
    .png({ palette: true, colours: 128, compressionLevel: 9 }).toBuffer();
  if (`data:image/png;base64,${png.toString('base64')}`.length > LOGO_DATA_LIMIT) throw new Error('Normalized sponsor logo exceeds the catalog limit');
  return png;
}

export async function sponsorLogo(entry: SponsorshipEntry) {
  if (!entry.logo) throw new Error(`Missing logo for ${entry.id}`);
  let cached = logoCache.get(entry.logo);
  if (!cached) {
    cached = normalizeSponsorLogo(readFileSync(resolve('public', entry.logo.slice(1))));
    logoCache.set(entry.logo, cached);
  }
  return cached;
}

export async function buildSponsorshipFeed(now = Date.now(), registryOverride: unknown = registry) {
  const data = validateSponsorship(registryOverride);
  // Exclude archived/expired credits; retain future entries so Hub can activate locally.
  const pending = (entries: SponsorshipEntry[]) => entries.filter((entry) => entry.active && (entry.endsAt === null || Date.parse(entry.endsAt) > now));
  const embed = (entries: SponsorshipEntry[]) => Promise.all(entries.map(async (entry) => ({
    ...entry, logoData: `data:image/png;base64,${(await sponsorLogo(entry)).toString('base64')}`,
  })));
  const feed = {
    schemaVersion: 1, generatedAt: new Date(now).toISOString(), maxPositions: SPONSORSHIP_LIMIT,
    supporters: await embed(pending(data.supporters).filter(hasLogoRecognition)),
    campaigns: await embed(pending(data.campaigns)),
  };
  if (Buffer.byteLength(JSON.stringify(feed)) > 262144) throw new Error('Sponsorship feed exceeds the catalog consumer limit');
  return feed;
}
const escape = (text: string) => text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));

/** Two bounded lines, preserving graphemes and making truncation visible. */
export function bannerNameLines(name: string) {
  const chars = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(name.trim())].map((part) => part.segment);
  const lines: string[] = [];
  let offset = 0;
  for (let row = 0; row < 2 && offset < chars.length; row++) {
    let line = '', units = 0;
    while (offset < chars.length) {
      const char = chars[offset];
      const width = /^[ilI .,'!|]$/.test(char) ? 0.4 : /^[MW@]$/.test(char) || /[^\x00-\x7F]/.test(char) ? 1 : 0.7;
      if (units + width > 8.4) break;
      units += width; line += char; offset++;
    }
    if (row === 1 && offset < chars.length) line = line.trimEnd() + '…';
    lines.push(line.trim());
  }
  return lines;
}

/** Static PNGs work with GitHub's image proxy; no JavaScript or tracking pixels. */
export async function renderSponsorshipBanner(group: 'supporters' | 'campaigns', repository?: string, entriesOverride?: SponsorshipEntry[], theme: 'light' | 'dark' = 'light') {
  const entries = entriesOverride ?? (group === 'campaigns' ? campaignsForRepository(sponsorship.campaigns, repository) : sponsorship.supporters.filter(hasLogoRecognition));
  if (entries.length > SPONSORSHIP_LIMIT) throw new Error('Too many banner positions');
  const foreground = theme === 'dark' ? '#f1f5f9' : '#111827';
  const secondary = theme === 'dark' ? '#cbd5e1' : '#475569';
  const accent = theme === 'dark' ? '#93c5fd' : '#2563eb';
  const title = group === 'supporters' ? 'Open-source supporters' : 'Sponsored placements';
  const subtitle = group === 'supporters' ? 'Helping keep Open WP Club plugins free and maintained.' : 'WordPress products and services · up to three shared positions.';
  const cards = entries.map((entry, index) => {
    const x = 28 + index * 306;
    const names = bannerNameLines(entry.name).map((line, row) => `<text x="${x + 88}" y="${140 + row * 25}" font-size="19" font-weight="bold" fill="${foreground}">${escape(line)}</text>`).join('');
    return `<clipPath id="name-${index}"><rect x="${x + 88}" y="118" width="185" height="52"/></clipPath><g clip-path="url(#name-${index})">${names}</g><text x="${x + 88}" y="193" font-size="13" fill="${secondary}">${group === 'supporters' ? 'Open-source supporter' : 'Sponsored'}</text>`;
  }).join('');
  const empty = entries.length ? '' : `<text x="28" y="145" font-size="23" fill="${accent}">${group === 'supporters' ? 'Become an open-source supporter' : 'Introduce your WordPress product here'}</text><text x="28" y="180" font-size="16" fill="${secondary}">${group === 'supporters' ? 'openwpclub.com/sponsors' : 'openwpclub.com/advertise'}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240"><g font-family="sans-serif"><text x="28" y="43" font-size="25" font-weight="bold" fill="${foreground}">${title}</text><text x="28" y="74" font-size="16" fill="${secondary}">${subtitle}</text>${cards}${empty}</g></svg>`;
  const overlays = await Promise.all(entries.map(async (entry, index) => ({
    input: await sharp(await sponsorLogo(entry)).resize(56, 56, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    left: 44 + index * 306, top: 128,
  })));
  return sharp(Buffer.from(svg)).composite(overlays).png().toBuffer();
}
