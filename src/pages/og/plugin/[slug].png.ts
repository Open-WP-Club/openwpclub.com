import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadFont(filename: string): ArrayBuffer {
  const buf = readFileSync(resolve(process.cwd(), 'src/assets/fonts', filename));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const fontBold = loadFont('inter-bold.woff');
const fontRegular = loadFont('inter-regular.woff');

export const getStaticPaths: GetStaticPaths = async () => {
  const allItems = await getCollection('plugins');
  const plugins = allItems.filter((p) => p.data.category === 'plugin');
  return plugins.map((plugin) => ({
    params: { slug: plugin.id },
    props: { plugin },
  }));
};

export async function GET({ props }: APIContext) {
  const { plugin } = props as { plugin: { data: { name: string; description: string; stars: number; version: string; language: string | null; downloads: string } } };
  const { name, description, stars, version, language, downloads } = plugin.data;

  const [bold, regular] = [fontBold, fontRegular];

  const downloadsNum = downloads ? parseInt(downloads, 10) : 0;
  const statsLine = [
    stars > 0 ? `★ ${stars}` : '',
    downloadsNum > 0 ? `↓ ${downloadsNum.toLocaleString()}` : '',
    version && version !== 'N/A' ? `v${version}` : '',
    language || '',
  ].filter(Boolean).join('  •  ');

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
          padding: '60px',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#3b82f6',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { color: 'white', fontSize: '24px', fontWeight: 700 },
                          children: '⟨⟩',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { color: '#93c5fd', fontSize: '20px', fontWeight: 700 },
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
                      color: 'white',
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
                      color: '#94a3b8',
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
                borderTop: '1px solid #334155',
                paddingTop: '24px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { color: '#93c5fd', fontSize: '20px' },
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
                      fontSize: '18px',
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
  const optimized = await sharp(png).png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 }).toBuffer();

  return new Response(new Uint8Array(optimized), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
