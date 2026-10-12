import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import registry from '../data/sponsorship.json';
import { sponsorship, validateSponsorship, campaignsForRepository, SPONSORSHIP_LIMIT } from './sponsorship';

export function buildSponsorshipFeed() {
  const data = validateSponsorship(registry);
  const embed = (entries: typeof sponsorship.supporters) => entries.map((entry) => ({
    ...entry,
    logoData: `data:image/png;base64,${readFileSync(resolve('public', entry.logo.slice(1))).toString('base64')}`,
  }));
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), maxPositions: SPONSORSHIP_LIMIT, supporters: embed(data.supporters), campaigns: embed(data.campaigns) };
}
const escape = (text: string) => text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));

/** Static PNGs work with GitHub's image proxy; no JavaScript or tracking pixels. */
export async function renderSponsorshipBanner(group: 'supporters' | 'campaigns', repository?: string) {
  const entries = group === 'campaigns' ? campaignsForRepository(sponsorship.campaigns, repository) : sponsorship.supporters;
  const title = group === 'supporters' ? 'Open-source supporters' : 'Sponsored placements';
  const subtitle = group === 'supporters' ? 'Helping keep Open WP Club plugins free and maintained.' : 'WordPress products and services · up to three shared positions.';
  const cards = entries.map((entry, index) => {
    const x = 28 + index * 306;
    return `<rect x="${x}" y="102" width="292" height="110" rx="12" fill="#f8fafc" stroke="#e2e8f0"/><text x="${x + 88}" y="147" font-size="20" font-weight="bold" fill="#111827">${escape(entry.name)}</text><text x="${x + 88}" y="176" font-size="14" fill="#475569">${group === 'supporters' ? 'Open-source supporter' : 'Sponsored'}</text>`;
  }).join('');
  const empty = entries.length ? '' : `<text x="28" y="145" font-size="23" fill="#2563eb">${group === 'supporters' ? 'Become an open-source supporter' : 'Introduce your WordPress product here'}</text><text x="28" y="180" font-size="16" fill="#475569">${group === 'supporters' ? 'openwpclub.com/sponsors' : 'openwpclub.com/advertise'}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240"><rect x="1" y="1" width="958" height="238" rx="18" fill="white" stroke="#cbd5e1"/><g font-family="sans-serif"><text x="28" y="43" font-size="25" font-weight="bold" fill="#111827">${title}</text><text x="28" y="74" font-size="16" fill="#475569">${subtitle}</text>${cards}${empty}</g></svg>`;
  const overlays = await Promise.all(entries.map(async (entry, index) => ({
    input: await sharp(resolve('public', entry.logo.slice(1))).resize(56, 56, { fit: 'contain', background: '#ffffff' }).png().toBuffer(),
    left: 44 + index * 306, top: 128,
  })));
  return sharp(Buffer.from(svg)).composite(overlays).png().toBuffer();
}
