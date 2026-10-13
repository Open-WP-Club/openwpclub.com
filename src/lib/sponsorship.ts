import { selectEntries, hasLogoRecognition, assertSponsorshipCapacity } from './sponsorship-policy.mjs';
export { hasLogoRecognition } from './sponsorship-policy.mjs';
import registry from '../data/sponsorship.json';

export const SPONSORSHIP_LIMIT = 3;
export const SPONSORSHIP_FEED_URL = 'https://openwpclub.com/sponsorship.json';
export interface SponsorshipEntry {
  id: string;
  name: string;
  url: string;
  logo?: string;
  description: string;
  tier: 'supporter' | 'partner' | 'champion';
  active: boolean;
  priority: number;
  startsAt: string;
  endsAt: string | null;
  repositories?: string[];
}
export interface SponsorshipRegistry {
  schemaVersion: 1;
  supporters: SponsorshipEntry[];
  campaigns: SponsorshipEntry[];
}

/** Reject malformed marketing data before publishing it to any consumer. */
export function validateSponsorship(value: unknown): SponsorshipRegistry {
  if (!value || typeof value !== 'object') throw new Error('Invalid sponsorship registry');
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported sponsorship schema');
  const ids = new Set<string>();
  for (const group of ['supporters', 'campaigns']) {
    if (!Array.isArray(data[group])) throw new Error(`Missing ${group}`);
    for (const item of data[group] as unknown[]) {
      if (!item || typeof item !== 'object') throw new Error('Invalid sponsorship entry');
      const entry = item as SponsorshipEntry;
      if (typeof entry.id !== 'string' || !/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) throw new Error('Invalid or duplicate sponsorship id');
      ids.add(entry.id);
      for (const field of ['name', 'description'] as const) {
        if (typeof entry[field] !== 'string' || !entry[field].trim() || entry[field].length > 240 || /[<>\r\n]/.test(entry[field])) throw new Error(`Invalid ${field}`);
      }
      if (entry.repositories !== undefined && (!Array.isArray(entry.repositories) || entry.repositories.length === 0 || entry.repositories.some((repo) => typeof repo !== 'string' || !/^(?:\*|[a-z0-9_-]+)$/.test(repo)))) throw new Error('Invalid campaign repository scope');
      const url = new URL(entry.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Sponsor URL must be HTTPS');
      if ((group === 'campaigns' || hasLogoRecognition(entry) || entry.logo !== undefined) && (typeof entry.logo !== 'string' || !/^\/images\/sponsors\/[a-z0-9-]+\.png$/.test(entry.logo))) throw new Error('Sponsor logos must be local PNG files');
      if (!['supporter', 'partner', 'champion'].includes(entry.tier) || typeof entry.active !== 'boolean' || !Number.isFinite(entry.priority)) throw new Error('Invalid sponsor status');
      for (const date of [entry.startsAt, entry.endsAt]) {
        if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().replace('.000', '') !== date)) throw new Error('Dates must be valid UTC timestamps');
      }
      if (!entry.startsAt || (entry.endsAt && Date.parse(entry.endsAt) <= Date.parse(entry.startsAt))) throw new Error('Invalid sponsorship period');
    }
  }
  assertSponsorshipCapacity(data);
  return data as unknown as SponsorshipRegistry;
}

export function getActiveSponsorships(data: SponsorshipRegistry, now = Date.now()) {
  const select = (entries: SponsorshipEntry[], rankTiers = false) => {
    const active = selectEntries(entries, now, rankTiers);
    if (active.length > SPONSORSHIP_LIMIT) throw new Error(`Only ${SPONSORSHIP_LIMIT} active positions per sponsorship group are available`);
    return active;
  };
  return { schemaVersion: 1 as const, supporters: select(data.supporters, true), campaigns: select(data.campaigns) };
}

export const sponsorship = getActiveSponsorships(validateSponsorship(registry));
export const sponsorshipTiers = [
  { name: 'Supporter', price: '€25 / month', perks: ['Your name and link on our sponsors page', 'A thank-you in our community updates'] },
  { name: 'Partner', price: '€100 / month', perks: ['Your logo and link on our website', 'Shared supporter placement in active plugin READMEs', 'Thanks in Plugin Hub, with no user tracking'], featured: true },
  { name: 'Champion', price: '€300 / month', perks: ['Everything in Partner', 'Priority within the shared supporter placement', 'One thank-you blog post when your sponsorship starts'] },
];

/** Website placements are rendered separately from imported README content. */
export function stripSponsorshipBlock(markdown: string): string {
  return markdown.replace(/<!-- OPENWPCLUB_SPONSORS_START -->[\s\S]*?<!-- OPENWPCLUB_SPONSORS_END -->/g, '');
}

export function campaignsForRepository(entries: SponsorshipEntry[], repository?: string) {
  return entries.filter((entry) => !repository || !entry.repositories || entry.repositories.includes('*') || entry.repositories.includes(repository.toLowerCase()));
}
