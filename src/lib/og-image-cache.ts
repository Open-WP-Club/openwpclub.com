import { createHash } from 'node:crypto';
import { readFile, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const cacheDir = resolve(root, '.cache/og-images');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Hash the renderer, fonts, cache implementation and dependencies so a design,
// font or library change cannot reuse an outdated image.
export function ogRendererVersion(source: string): string {
  const hash = createHash('sha256');
  for (const file of [source, 'src/lib/og-image-cache.ts', 'src/assets/fonts/inter-bold.woff', 'src/assets/fonts/inter-regular.woff', 'src/assets/openwpclub-github.png', 'pnpm-lock.yaml']) {
    hash.update(file).update(readFileSync(resolve(root, file)));
  }
  return hash.digest('hex');
}

export async function cachedOgImage(version: string, data: unknown, render: () => Promise<Uint8Array>): Promise<Uint8Array> {
  const key = createHash('sha256').update(version).update(JSON.stringify(data)).digest('hex');
  const file = resolve(cacheDir, `${key}.png`);
  try {
    const cached = await readFile(file);
    if (cached.length > pngSignature.length && cached.subarray(0, pngSignature.length).equals(pngSignature)) return cached;
  } catch { /* A missing or unreadable cache entry is regenerated. */ }

  const image = await render();
  // Caching is optional: an unwritable cache must not prevent site builds.
  let temporary: string | undefined;
  try {
    await mkdir(cacheDir, { recursive: true });
    temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, image);
    await rename(temporary, file);
  } catch {
    if (temporary) await unlink(temporary).catch(() => {});
  }
  return image;
}
