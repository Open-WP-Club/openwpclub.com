import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const catalog = { products: [{ repo_name: 'sample', display_name: 'Sample', type: 'plugin', description: 'Sample', repo_url: 'https://github.com/Open-WP-Club/sample', version: '1.0.0' }] };
const release = { tag_name: 'v2.0.0', published_at: '2026-10-13T12:00:00Z', html_url: 'https://github.com/Open-WP-Club/sample/releases/tag/v2.0.0', assets: [] };

function runRefresh(mode: string, monthly = true) {
  const dir = mkdtempSync(join(tmpdir(), 'openwp-snapshot-'));
  mkdirSync(join(dir, 'readmes'));
  const originals: Record<string, string> = {
    'plugins.json': JSON.stringify([{ id: 'sample', name: 'Sample', category: 'plugin', version: '1.0.0', releaseAssets: [{ name: 'keep.zip' }] }]),
    'releases.json': JSON.stringify([{ repo: 'sample', version: '1.0.0' }]),
    'contributors.json': JSON.stringify([{ login: 'keep', contributions: 100 }]),
    'repo-contributors.json': '{}',
    'freshness.json': JSON.stringify({ catalogUpdatedAt: '2026-01-01T00:00:00Z', releasesUpdatedAt: '2026-01-01T00:00:00Z', trafficUpdatedAt: '2026-01-01T00:00:00Z' }),
    'traffic.json': JSON.stringify({ updatedAt: '2026-01-01T00:00:00Z', cumulativeViews: 9 }),
    'readmes/sample.html': '<h1>Keep existing documentation</h1>',
  };
  for (const [file, value] of Object.entries(originals)) writeFileSync(join(dir, file), value);
  const mock = join(dir, 'network.mjs');
  writeFileSync(mock, `
    const catalog=${JSON.stringify(catalog)}, release=${JSON.stringify(release)}, mode=${JSON.stringify(mode)};
    globalThis.fetch=async (url)=>{
      url=String(url);
      if(url.endsWith('catalog.json')) return Response.json(catalog);
      if(url.includes('rate_limit')) return Response.json({resources:{core:{remaining:5000,limit:5000,reset:0}}});
      if(url.includes('/releases/latest')) return mode==='release-fail' ? new Response('',{status:503}) : Response.json(release);
      if(url.endsWith('/readme')) return mode==='readme-case' ? new Response('',{status:503}) : Response.json({content:Buffer.from('# Fresh docs').toString('base64')});
      if(url.includes('raw.githubusercontent.com') && /readme.md$/.test(url)) return new Response('# Lowercase documentation');
      if(url.includes('raw.githubusercontent.com') && /README/.test(url)) return new Response('',{status:404});
      if(url.includes('/contributors')) return mode==='contributors-fail' ? new Response('',{status:503}) : Response.json([]);
      if(url.includes('/releases?')) return Response.json([]);
      if(url.includes('/graphql')) return Response.json({errors:[{message:'unavailable'}]});
      if(url.endsWith('traffic-state.json')) return new Response('broken source',{status:200});
      return mode==='stats-fail' ? new Response('',{status:503}) : Response.json({name:'sample',default_branch:'main',stargazers_count:4,forks_count:1,pushed_at:'2026-10-13T12:00:00Z'});
    };
  `);
  const script = monthly ? resolve('scripts/fetch-data.ts') : resolve('scripts/fetch-releases.mjs');
  const args = monthly ? ['--import', mock, '--import', 'tsx', script] : ['--import', mock, script];
  const result = spawnSync(process.execPath, args, { cwd: resolve('.'), env: { ...process.env, OPENWP_DATA_DIR: dir, GITHUB_TOKEN: 'fixture-only' }, encoding: 'utf8', timeout: 30000 });
  return { dir, originals, result };
}

describe('published snapshots survive unavailable sources', () => {
  it.each(['stats-fail', 'release-fail', 'contributors-fail'])('preserves every existing monthly snapshot on %s', (mode) => {
    const run = runRefresh(mode);
    try {
      expect(run.result.status, run.result.stderr).not.toBe(0);
      for (const [file, value] of Object.entries(run.originals)) expect(readFileSync(join(run.dir, file), 'utf8')).toBe(value);
    } finally { rmSync(run.dir, { recursive: true, force: true }); }
  });
  it('updates a successful monthly snapshot while preserving failed optional traffic and its date', () => {
    const run = runRefresh('readme-case');
    try {
      expect(run.result.status, run.result.stderr).toBe(0);
      expect(readFileSync(join(run.dir, 'readmes/sample.html'), 'utf8')).toContain('Lowercase documentation');
      expect(readFileSync(join(run.dir, 'traffic.json'), 'utf8')).toBe(run.originals['traffic.json']);
      expect(JSON.parse(readFileSync(join(run.dir, 'freshness.json'), 'utf8')).trafficUpdatedAt).toBe('2026-01-01T00:00:00Z');
    } finally { rmSync(run.dir, { recursive: true, force: true }); }
  });
  it('preserves release/catalog/freshness data when a weekly source fails', () => {
    const run = runRefresh('release-fail', false);
    try {
      expect(run.result.status).not.toBe(0);
      for (const file of ['plugins.json', 'releases.json', 'freshness.json']) expect(readFileSync(join(run.dir, file), 'utf8')).toBe(run.originals[file]);
    } finally { rmSync(run.dir, { recursive: true, force: true }); }
  });
  it('updates version and release data on a successful weekly refresh', () => {
    const run = runRefresh('success', false);
    try {
      expect(run.result.status, run.result.stderr).toBe(0);
      expect(JSON.parse(readFileSync(join(run.dir, 'plugins.json'), 'utf8'))[0].version).toBe('2.0.0');
      expect(JSON.parse(readFileSync(join(run.dir, 'releases.json'), 'utf8'))[0].version).toBe('2.0.0');
    } finally { rmSync(run.dir, { recursive: true, force: true }); }
  });
});
