import { renderSponsorshipBanner } from '../../lib/sponsorship-assets';
export const prerender = true;
export async function GET() {
  return new Response(new Uint8Array(await renderSponsorshipBanner('campaigns')), { headers: { 'Content-Type': 'image/png' } });
}
