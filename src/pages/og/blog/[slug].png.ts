import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadFont(filename: string): ArrayBuffer {
  const buf = readFileSync(resolve(process.cwd(), 'src/assets/fonts', filename));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const fontBold = loadFont('inter-bold.woff');
const fontRegular = loadFont('inter-regular.woff');

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
};

export async function GET({ props }: APIContext) {
  const { post } = props as { post: { data: { title: string; description: string; author: string; date: Date; tags: string[] } } };
  const { title, description, author, date, tags } = post.data;

  const [bold, regular] = [fontBold, fontRegular];

  const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const tagLine = tags.slice(0, 3).map((t) => `#${t}`).join('  ');

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
          // Header: logo + blog label
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: '12px' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '48px', height: '48px', borderRadius: '12px', background: '#3b82f6',
                          },
                          children: [{ type: 'div', props: { style: { color: 'white', fontSize: '24px', fontWeight: 700 }, children: '⟨⟩' } }],
                        },
                      },
                      { type: 'div', props: { style: { color: '#93c5fd', fontSize: '20px', fontWeight: 700 }, children: 'Open WP Club' } },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex', alignItems: 'center',
                      background: 'rgba(59,130,246,0.2)', borderRadius: '999px',
                      padding: '6px 16px', color: '#93c5fd', fontSize: '16px', fontWeight: 700,
                    },
                    children: 'Blog',
                  },
                },
              ],
            },
          },
          // Main: title + description
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
                      fontSize: title.length > 50 ? '38px' : '48px',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      marginBottom: '20px',
                    },
                    children: title.length > 80 ? title.slice(0, 80) + '…' : title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { color: '#94a3b8', fontSize: '22px', lineHeight: 1.4 },
                    children: description.length > 120 ? description.slice(0, 120) + '…' : description,
                  },
                },
              ],
            },
          },
          // Footer: author + date + tags
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderTop: '1px solid #334155', paddingTop: '24px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', gap: '4px' },
                    children: [
                      { type: 'div', props: { style: { color: '#e2e8f0', fontSize: '18px', fontWeight: 700 }, children: author } },
                      { type: 'div', props: { style: { color: '#64748b', fontSize: '16px' }, children: formattedDate } },
                    ],
                  },
                },
                tagLine
                  ? { type: 'div', props: { style: { color: '#3b82f6', fontSize: '16px' }, children: tagLine } }
                  : { type: 'div', props: { style: {}, children: '' } },
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

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
