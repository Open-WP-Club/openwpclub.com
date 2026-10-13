import { buildSponsorshipFeed } from '../lib/sponsorship-assets';
export const prerender = true;
export async function GET() {
  return new Response(JSON.stringify(await buildSponsorshipFeed()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
