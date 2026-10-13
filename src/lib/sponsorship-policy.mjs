/** @param {import('./sponsorship').SponsorshipEntry} entry */
export function hasLogoRecognition(entry) {
  return entry.tier === 'partner' || entry.tier === 'champion';
}

/** @param {import('./sponsorship').SponsorshipEntry} entry */
export function isActive(entry, now = Date.now()) {
  return entry.active && Date.parse(entry.startsAt) <= now && (entry.endsAt === null || Date.parse(entry.endsAt) > now);
}

/** @param {import('./sponsorship').SponsorshipEntry[]} entries */
export function selectEntries(entries, now = Date.now(), rankTiers = false) {
  return entries.filter((entry) => isActive(entry, now)).sort((a, b) => {
    if (rankTiers) {
      const rank = { supporter: 0, partner: 1, champion: 2 };
      const order = rank[b.tier] - rank[a.tier];
      if (order) return order;
    }
    return b.priority - a.priority || a.id.localeCompare(b.id);
  });
}

/** Check future overlaps too, so an upcoming campaign cannot break a scheduled build. */
export function assertSponsorshipCapacity(data, limit = 3) {
  for (const group of ['supporters', 'campaigns']) {
    const entries = data[group].filter((entry) => entry.active);
    const boundaries = new Set(entries.flatMap((entry) => [Date.parse(entry.startsAt), ...(entry.endsAt ? [Date.parse(entry.endsAt)] : [])]));
    for (const boundary of boundaries) {
      if (selectEntries(entries, boundary).length > limit) throw new Error(`Only ${limit} simultaneous ${group} positions are available`);
    }
  }
}

/** A deterministic transition marker: do not create a commit on every timer tick. */
export function sponsorshipState(data, now = Date.now()) {
  assertSponsorshipCapacity(data);
  const next = [...data.supporters, ...data.campaigns].filter((entry) => entry.active)
    .flatMap((entry) => [Date.parse(entry.startsAt), ...(entry.endsAt ? [Date.parse(entry.endsAt)] : [])])
    .filter((date) => date > now).sort((a, b) => a - b)[0];
  return {
    supporters: selectEntries(data.supporters, now, true).map((entry) => entry.id),
    campaigns: selectEntries(data.campaigns, now).map((entry) => entry.id),
    nextTransition: next === undefined ? null : new Date(next).toISOString(),
  };
}
