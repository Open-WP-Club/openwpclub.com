import { describe, expect, it } from 'vitest';
import { getActiveSponsorships, validateSponsorship, stripSponsorshipBlock, campaignsForRepository } from '../sponsorship';
import source from '../../data/sponsorship.json';
const clone = () => structuredClone(source);
const now = Date.parse('2026-10-15T00:00:00Z');

describe('central sponsorship registry', () => {
  it('removes only the shared README block from website imports', () => {
    expect(stripSponsorshipBlock('# Usage\n<!-- OPENWPCLUB_SPONSORS_START -->ad<!-- OPENWPCLUB_SPONSORS_END -->\n## License')).toBe('# Usage\n\n## License');
  });
  it('limits repository campaigns to their agreed audience', () => {
    const entries = [{ ...validateSponsorship(clone()).supporters[0], repositories: ['plugin-hub'] }];
    expect(campaignsForRepository(entries, 'plugin-hub')).toHaveLength(1);
    expect(campaignsForRepository(entries, 'another-plugin')).toHaveLength(0);
  });
  it('publishes MGKNeT as a supporter without inventing a paid campaign', () => {
    const data = getActiveSponsorships(validateSponsorship(clone()), now);
    expect(data.supporters[0].url).toBe('https://mgknet.com/');
    expect(data.campaigns).toEqual([]);
  });
  it('removes expired and future placements independently of import state', () => {
    const data = clone();
    data.supporters[0].endsAt = '2026-10-14T00:00:00Z' as never;
    expect(getActiveSponsorships(validateSponsorship(data), now).supporters).toEqual([]);
    data.supporters[0].endsAt = null;
    data.supporters[0].startsAt = '2026-11-01T00:00:00Z';
    expect(getActiveSponsorships(validateSponsorship(data), now).supporters).toEqual([]);
  });
  it('rejects unsafe URLs, remote assets, malformed dates and duplicate identities', () => {
    for (const [field, value] of [['url', 'javascript:alert(1)'], ['url', 'https://user:password@example.com'], ['logo', '/images/sponsors/../secret.png'], ['name', '<script>'], ['startsAt', '2026-02-31T00:00:00Z']]) {
      const data = clone();
      Object.assign(data.supporters[0], { [field]: value });
      expect(() => validateSponsorship(data)).toThrow();
    }
    const data = clone(); data.supporters.push(data.supporters[0]);
    expect(() => validateSponsorship(data)).toThrow();
  });
  it('allows three supporters and three campaigns but rejects an oversold group', () => {
    const data = clone();
    data.supporters = [0, 1, 2].map((n) => ({ ...source.supporters[0], id: `supporter-${n}` }));
    const valid = validateSponsorship(data);
    valid.campaigns = valid.supporters.map((entry) => ({ ...entry, id: `campaign-${entry.id}` }));
    expect(getActiveSponsorships(valid, now).campaigns).toHaveLength(3);
    valid.supporters.push({ ...valid.supporters[0], id: 'fourth' });
    expect(() => getActiveSponsorships(valid, now)).toThrow('Only 3');
  });
});
