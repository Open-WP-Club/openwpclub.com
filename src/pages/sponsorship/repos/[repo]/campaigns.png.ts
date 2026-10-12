import type { APIContext } from 'astro';
import plugins from '../../../../data/plugins.json';
import { renderSponsorshipBanner } from '../../../../lib/sponsorship-assets';
export const prerender = true;
export function getStaticPaths() {
  const repositories = new Set(plugins.filter((plugin) => plugin.category === 'plugin').map((plugin) => plugin.githubUrl.split('/').pop()!.toLowerCase()));
  return [...repositories].map((repo) => ({ params: { repo } }));
}
export async function GET({ params }: APIContext) {
  return new Response(new Uint8Array(await renderSponsorshipBanner('campaigns', params.repo)), { headers: { 'Content-Type': 'image/png' } });
}
