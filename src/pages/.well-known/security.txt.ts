import type { APIRoute } from 'astro';
import { GITHUB_ORG_URL } from '../../lib/config';

export const GET: APIRoute = async () => {
  // RFC 9116 requires an Expires field. This is a static site built once and deployed.
  // Update this date whenever the site is rebuilt (at least once per year).
  const expires = '2027-01-01T00:00:00.000Z';

  const lines = [
    `Contact: ${GITHUB_ORG_URL}/.github/security/advisories`,
    `Contact: https://discord.gg/ysBW334DYR`,
    `Expires: ${expires}`,
    `Preferred-Languages: en, bg`,
    `Canonical: https://openwpclub.com/.well-known/security.txt`,
    `Policy: ${GITHUB_ORG_URL}/.github/blob/main/SECURITY.md`,
  ];

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
