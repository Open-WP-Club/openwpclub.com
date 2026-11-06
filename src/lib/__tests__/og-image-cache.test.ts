import { createHash, randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { cachedOgImage } from '../og-image-cache';

const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);

describe('social image cache', () => {
  it('reuses images, regenerates on input changes, and repairs corrupt entries', async () => {
    const version = randomUUID();
    const data = { title: 'Example' };
    const changed = { title: 'Updated' };
    const pathFor = (input: unknown) => resolve('.cache/og-images', `${createHash('sha256').update(version).update(JSON.stringify(input)).digest('hex')}.png`);
    const render = vi.fn(async () => image);
    try {
      await cachedOgImage(version, data, render);
      await cachedOgImage(version, data, render);
      expect(render).toHaveBeenCalledTimes(1);
      await cachedOgImage(version, changed, render);
      expect(render).toHaveBeenCalledTimes(2);
      await writeFile(pathFor(data), 'not a PNG');
      await cachedOgImage(version, data, render);
      expect(render).toHaveBeenCalledTimes(3);
    } finally {
      await Promise.all([rm(pathFor(data), { force: true }), rm(pathFor(changed), { force: true })]);
    }
  });
});
