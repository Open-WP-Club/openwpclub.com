import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseRelease, synchronizeReleases } from './release-refresh.mjs';
const ORG = 'Open-WP-Club';
const DATA_DIR = process.env.OPENWP_DATA_DIR ? resolve(process.env.OPENWP_DATA_DIR) : fileURLToPath(new URL('../src/data/', import.meta.url));
const TOKEN = process.env.GITHUB_TOKEN || '';
const BATCH_SIZE = 10;

async function main() {
  const [catalogResponse, plugins, freshness] = await Promise.all([
    fetch(`https://raw.githubusercontent.com/${ORG}/.github/main/catalog.json`, { signal: AbortSignal.timeout(15000) }),
    readFile(resolve(DATA_DIR, 'plugins.json'), 'utf8').then(JSON.parse),
    readFile(resolve(DATA_DIR, 'freshness.json'), 'utf8').then(JSON.parse),
  ]);
  if (!catalogResponse.ok) throw new Error(`Catalog returned HTTP ${catalogResponse.status}`);
  const catalog = await catalogResponse.json();
  if (!Array.isArray(catalog.products)) throw new Error('Invalid product catalog');
  const categories = new Map(plugins.map((plugin) => [plugin.id.toLowerCase(), plugin.category]));
  const products = catalog.products.filter(({ type }) => ['app', 'plugin'].includes(type));
  const releases = [];
  for (let index = 0; index < products.length; index += BATCH_SIZE) {
    // Any failed request aborts before writes; no partial list can replace good data.
    const results = await Promise.all(products.slice(index, index + BATCH_SIZE).map(async (product) => {
      const response = await fetch(`https://api.github.com/repos/${ORG}/${encodeURIComponent(product.repo_name)}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'open-wp-club-release-refresh', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`${product.repo_name} returned HTTP ${response.status}`);
      return parseRelease(product.repo_name, await response.json(), categories.get(product.repo_name.toLowerCase()) || product.type);
    }));
    releases.push(...results.filter(Boolean));
  }
  releases.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const updated = synchronizeReleases(plugins, releases);
  const changelog = releases.map(({ assets, downloads, ...release }) => release);
  // These timestamps describe a complete, successful check, including unchanged releases.
  const updatedFreshness = { ...freshness, releasesUpdatedAt: new Date().toISOString() };
  await writeFile(resolve(DATA_DIR, 'plugins.json'), JSON.stringify(updated, null, 2) + '\n');
  await writeFile(resolve(DATA_DIR, 'releases.json'), JSON.stringify(changelog, null, 2) + '\n');
  await writeFile(resolve(DATA_DIR, 'freshness.json'), JSON.stringify(updatedFreshness, null, 2) + '\n');
  console.log(`Verified ${products.length} repositories and synchronized ${releases.length} release records with catalog downloads.`);
}
main().catch((error) => { console.error(`Release refresh failed: ${error.message}`); process.exitCode = 1; });
