import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ORG = 'Open-WP-Club';
const RELEASES_FILE = fileURLToPath(new URL('../src/data/releases.json', import.meta.url));
const FRESHNESS_FILE = fileURLToPath(new URL('../src/data/freshness.json', import.meta.url));
const PLUGINS_FILE = fileURLToPath(new URL('../src/data/plugins.json', import.meta.url));
const CSV_URL = `https://raw.githubusercontent.com/${ORG}/.github/main/plugins.csv`;
const TOKEN = process.env.GITHUB_TOKEN || '';
const BATCH_SIZE = 10;

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'open-wp-club-release-refresh',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  };
}

function firstCsvField(line) {
  if (!line.startsWith('"')) return line.split(',', 1)[0].trim();

  let value = '';
  for (let index = 1; index < line.length; index++) {
    if (line[index] !== '"') {
      value += line[index];
      continue;
    }
    if (line[index + 1] === '"') {
      value += '"';
      index++;
      continue;
    }
    break;
  }
  return value.trim();
}

async function fetchRepoNames() {
  const response = await fetch(CSV_URL, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`plugins.csv returned HTTP ${response.status}`);

  const lines = (await response.text()).trim().split(/\r?\n/);
  return [...new Set(lines.slice(1).map(firstCsvField).filter(Boolean))];
}

async function fetchLatestRelease(repo) {
  const response = await fetch(`https://api.github.com/repos/${ORG}/${encodeURIComponent(repo)}/releases/latest`, {
    headers: headers(),
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${repo} returned HTTP ${response.status}`);

  const release = await response.json();
  if (release.draft || release.prerelease || !release.published_at) return null;

  return {
    repo: repo.toLowerCase(),
    name: release.name || release.tag_name,
    version: String(release.tag_name || '').replace(/^v/i, ''),
    publishedAt: release.published_at,
    url: release.html_url,
    notes: release.body || '',
  };
}

async function main() {
  const [repoNames, plugins, currentReleases, freshness] = await Promise.all([
    fetchRepoNames(),
    readFile(PLUGINS_FILE, 'utf8').then(JSON.parse),
    readFile(RELEASES_FILE, 'utf8').then(JSON.parse),
    readFile(FRESHNESS_FILE, 'utf8').then(JSON.parse),
  ]);

  const categories = new Map(plugins.map((plugin) => [plugin.id.toLowerCase(), plugin.category]));
  const releases = [];

  for (let index = 0; index < repoNames.length; index += BATCH_SIZE) {
    const batch = repoNames.slice(index, index + BATCH_SIZE);
    const results = await Promise.all(batch.map(fetchLatestRelease));
    for (const release of results) {
      if (!release) continue;
      releases.push({
        ...release,
        category: categories.get(release.repo.toLowerCase()) || 'plugin',
      });
    }
  }

  releases.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  if (JSON.stringify(releases) === JSON.stringify(currentReleases)) {
    console.log(`Release data is current (${releases.length} repositories checked).`);
    return;
  }

  await Promise.all([
    writeFile(RELEASES_FILE, `${JSON.stringify(releases, null, 2)}\n`),
    writeFile(FRESHNESS_FILE, `${JSON.stringify({
      ...freshness,
      releasesUpdatedAt: new Date().toISOString(),
    }, null, 2)}\n`),
  ]);

  console.log(`Updated ${releases.length} latest repository releases.`);
}

main().catch((error) => {
  console.error(`Release refresh failed: ${error.message}`);
  process.exitCode = 1;
});
