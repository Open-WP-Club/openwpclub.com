import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Generate from the current catalog and blog content, then store the resulting
// files for normal builds. A failed build never replaces the saved images.
await mkdir(resolve('.cache/empty-public'), { recursive: true });
const build = spawnSync('pnpm', ['exec', 'astro', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, OPENWP_GENERATE_OG: '1' },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const source = resolve('dist/og');
const target = resolve('public/og');
for (const kind of ['plugin', 'app', 'blog']) {
  const dir = resolve(source, kind);
  const files = (await readdir(dir)).filter((name) => name.endsWith('.png'));
  if (files.length === 0) throw new Error(`No ${kind} social images were generated`);
  await mkdir(resolve(target, kind), { recursive: true });
  for (const file of files) await cp(resolve(dir, file), resolve(target, kind, file));
  console.log(`Saved ${files.length} ${kind} social images`);
}
