import type { APIContext } from 'astro';
import registry from '../../../data/sponsorship.json';
import { hasLogoRecognition, validateSponsorship, type SponsorshipEntry } from '../../../lib/sponsorship';
import { sponsorLogo } from '../../../lib/sponsorship-assets';
export const prerender = true;
export function getStaticPaths() {
  const data = validateSponsorship(registry);
  const entries = [...data.supporters.filter(hasLogoRecognition), ...data.campaigns].filter((entry) => entry.active);
  return entries.map((entry) => ({ params: { id: entry.id }, props: { entry } }));
}
export async function GET({ props }: APIContext) {
  return new Response(new Uint8Array(await sponsorLogo(props.entry as SponsorshipEntry)), { headers: { 'Content-Type': 'image/png' } });
}
