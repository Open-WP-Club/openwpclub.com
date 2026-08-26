import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadFont(filename: string): ArrayBuffer {
  const buffer = readFileSync(resolve(process.cwd(), 'src/assets/fonts', filename));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

const fontBold = loadFont('inter-bold.woff');
const fontRegular = loadFont('inter-regular.woff');

export const getStaticPaths: GetStaticPaths = async () => {
  const apps = (await getCollection('plugins')).filter((entry) => entry.data.category === 'app');
  return apps.map((app) => ({ params: { slug: app.id }, props: { app } }));
};

export async function GET({ props }: APIContext) {
  const { app } = props as { app: { data: { name: string; description: string; version: string; platforms: string[] } } };
  const { name, description, version, platforms } = app.data;
  const platformLine = platforms.map((platform) => platform === 'macos' ? 'macOS' : platform.charAt(0).toUpperCase() + platform.slice(1)).join(' · ');

  const svg = await satori({
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)', padding: '60px', fontFamily: 'Inter' },
      children: [
        { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [
          { type: 'div', props: { style: { color: '#93c5fd', fontSize: '22px', fontWeight: 700 }, children: 'Open WP Club' } },
          { type: 'div', props: { style: { color: '#bfdbfe', background: 'rgba(59,130,246,.2)', borderRadius: '999px', padding: '8px 18px', fontSize: '17px', fontWeight: 700 }, children: 'App' } },
        ] } },
        { type: 'div', props: { style: { flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }, children: [
          { type: 'div', props: { style: { color: 'white', fontSize: name.length > 28 ? '44px' : '54px', fontWeight: 700, lineHeight: 1.15, marginBottom: '18px' }, children: name } },
          { type: 'div', props: { style: { color: '#94a3b8', fontSize: '24px', lineHeight: 1.4 }, children: description.length > 145 ? `${description.slice(0, 145)}…` : description } },
        ] } },
        { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '24px', color: '#93c5fd', fontSize: '19px' }, children: [
          { type: 'div', props: { children: platformLine } },
          { type: 'div', props: { children: version ? `v${version} · Free & Open Source` : 'Free & Open Source' } },
        ] } },
      ],
    },
  }, { width: 1200, height: 630, fonts: [
    { name: 'Inter', data: fontBold, weight: 700, style: 'normal' },
    { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
  ] });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  const optimized = await sharp(png).png({ palette: true, quality: 90, compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(optimized), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}
