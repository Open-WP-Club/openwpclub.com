import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');

if (!existsSync(DIST)) throw new Error('dist/ not found. Run pnpm build first.');

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function routeExists(route: string): boolean {
  const pathname = decodeURIComponent(route.split(/[?#]/)[0]);
  if (!pathname || pathname === '/') return existsSync(resolve(DIST, 'index.html'));
  const relative = pathname.replace(/^\//, '');
  return existsSync(resolve(DIST, relative)) ||
    existsSync(resolve(DIST, relative, 'index.html')) ||
    existsSync(resolve(DIST, `${relative}.html`));
}

const brokenInternal = new Set<string>();
for (const file of walk(DIST).filter((path) => path.endsWith('.html'))) {
  const html = readFileSync(file, 'utf-8');
  for (const match of html.matchAll(/\shref=["']([^"']+)["']/g)) {
    const href = match[1];
    if (href.startsWith('/') && !href.startsWith('//') && !routeExists(href)) brokenInternal.add(href);
  }
}

const redirects = readFileSync(resolve(ROOT, 'public/_redirects'), 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
for (const redirect of redirects) {
  const [, target] = redirect.split(/\s+/);
  if (target?.startsWith('/') && !routeExists(target)) brokenInternal.add(`redirect target: ${target}`);
}

const catalog = JSON.parse(readFileSync(resolve(ROOT, 'src/data/plugins.json'), 'utf-8')) as Array<{ releaseAssets?: Array<{ url: string }> }>;
const downloadUrls = [...new Set(catalog.flatMap((entry) => entry.releaseAssets?.map((asset) => asset.url) || []))];
const brokenDownloads: string[] = [];
for (const url of downloadUrls) {
  try {
    const response = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0', 'User-Agent': 'open-wp-club-link-check' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!response.ok) brokenDownloads.push(`${response.status} ${url}`);
    await response.body?.cancel();
  } catch (error) {
    brokenDownloads.push(`${(error as Error).message} ${url}`);
  }
}

if (brokenInternal.size || brokenDownloads.length) {
  if (brokenInternal.size) console.error(`Broken internal links:\n${[...brokenInternal].join('\n')}`);
  if (brokenDownloads.length) console.error(`Broken download links:\n${brokenDownloads.join('\n')}`);
  process.exit(1);
}

console.log(`Link check passed: ${downloadUrls.length} download assets and all internal routes are valid.`);
