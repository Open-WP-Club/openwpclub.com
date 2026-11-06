import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cachedOgImage, ogRendererVersion } from '../../../lib/og-image-cache';

function loadFont(filename: string): ArrayBuffer {
  const buf = readFileSync(resolve(process.cwd(), 'src/assets/fonts', filename));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const fontBold = loadFont('inter-bold.woff');
const fontRegular = loadFont('inter-regular.woff');
const logo = `data:image/png;base64,${readFileSync(resolve(process.cwd(), 'src/assets/openwpclub-github.png')).toString('base64')}`;
const rendererVersion = ogRendererVersion('src/pages/og/plugin/[slug].png.ts');

export const getStaticPaths: GetStaticPaths = async () => {
  if (process.env.OPENWP_GENERATE_OG !== '1') return [];
  const allItems = await getCollection('plugins');
  const plugins = allItems.filter((p) => p.data.category === 'plugin');
  return plugins.map((plugin) => ({
    params: { slug: plugin.id },
    props: { plugin },
  }));
};

export async function GET({ props }: APIContext) {
  const { plugin } = props as { plugin: { data: { name: string; description: string; version: string; downloads: string } } };
  const { name, description, version, downloads } = plugin.data;

  const [bold, regular] = [fontBold, fontRegular];

  const downloadsNum = downloads ? parseInt(downloads, 10) : 0;
  const statsLine = [
    downloadsNum > 0 ? `${downloadsNum.toLocaleString()} downloads` : '',
    version && version !== 'N/A' ? `v${version}` : '',
  ].filter(Boolean).join('  •  ');

  const optimized = await cachedOgImage(rendererVersion, { name, description, version, downloads }, async () => {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '60px',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
              children: [
                { type: 'img', props: { src: logo, width: 48, height: 48, style: { borderRadius: '10px' } } },
                {
                  type: 'div',
                  props: {
                    style: { color: '#1d4ed8', fontSize: '20px', fontWeight: 700 },
                    children: 'Open WP Club',
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#0f172a',
                      fontSize: name.length > 30 ? '42px' : '52px',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      marginBottom: '16px',
                    },
                    children: name,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#475569',
                      fontSize: '24px',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                    },
                    children: description.length > 140 ? description.slice(0, 140) + '…' : description,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '24px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { color: '#1d4ed8', fontSize: '26px' },
                    children: statsLine,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#64748b',
                      fontSize: '24px',
                    },
                    children: 'Free & Open Source',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: bold, weight: 700, style: 'normal' },
        { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      ],
    },
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();
  return sharp(png).png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 }).toBuffer();
  });

  return new Response(new Uint8Array(optimized), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
