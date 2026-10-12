import { buildSponsorshipFeed } from '../lib/sponsorship-assets';
export const prerender = true;
export function GET() {
  return new Response(JSON.stringify(buildSponsorshipFeed()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
