import { describe, expect, it } from 'vitest';
import { transitionState } from '../../../scripts/refresh-sponsorship.mjs';
import { getActiveSponsorships, hasLogoRecognition, validateSponsorship } from '../sponsorship';
import source from '../../data/sponsorship.json';

describe('package rights and scheduled transitions', () => {
  it('restricts company recognition and gives Champion priority over Partner', () => {
    const registry = structuredClone(source);
    registry.supporters = [
      { ...source.supporters[0], id: 'basic', tier: 'supporter', priority: 999 },
      { ...source.supporters[0], id: 'partner', tier: 'partner', priority: 100 },
      { ...source.supporters[0], id: 'champion', tier: 'champion', priority: 0 },
    ];
    const active = getActiveSponsorships(validateSponsorship(registry), Date.parse('2026-10-15T00:00:00Z'));
    expect(active.supporters.filter(hasLogoRecognition).map((entry) => entry.id)).toEqual(['champion', 'partner']);
    expect(active.supporters).toHaveLength(3);
  });
  it('changes the trigger only at start/end boundaries, not on every timer tick', () => {
    const registry = structuredClone(source);
    registry.supporters[0].endsAt = '2026-10-20T12:00:00Z' as never;
    expect(transitionState(registry, Date.parse('2026-10-19T12:00:00Z'))).toEqual(transitionState(registry, Date.parse('2026-10-19T12:15:00Z')));
    const before = transitionState(registry, Date.parse('2026-10-20T11:59:59Z'));
    const after = transitionState(registry, Date.parse('2026-10-20T12:00:00Z'));
    expect(before.supporters).toEqual(['mgknet']);
    expect(after.supporters).toEqual([]);
    expect(after.nextTransition).toBeNull();
  });
  it('rejects future overselling before the activation build', () => {
    const registry = structuredClone(source);
    registry.supporters = Array.from({ length: 4 }, (_, i) => ({ ...source.supporters[0], id: `future-${i}`, startsAt: '2027-01-01T00:00:00Z' }));
    expect(() => validateSponsorship(registry)).toThrow('Only 3');
  });
});
