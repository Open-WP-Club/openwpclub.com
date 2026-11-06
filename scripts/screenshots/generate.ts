import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { pluginDownloadUrl } from '../../src/lib/plugin-download';

type Scenario = { plugin: string; path: string; selector: string; caption: string };
type Plugin = Parameters<typeof pluginDownloadUrl>[0] & { id: string; name: string; category: string; topics: string[]; description: string; compatibility?: { woocommerce?: string; woocommerceTested?: string } };
type Entry = { plugin: string; src: string; caption: string };
const scenarios: Scenario[] = JSON.parse(await readFile('scripts/screenshots/config.json', 'utf8'));
const adminMenus: Record<string, string> = JSON.parse(await readFile('scripts/screenshots/admin-menus.json', 'utf8'));
// Some release ZIPs install under a different directory than their catalog slug.
const installedPluginFiles: Record<string, string> = {
  'better-viewer-fluent-forms': 'client-fluent-submissions/client-fluent-submissions.php',
  'eu-vat-wp': 'wp-eu-vat/wp-eu-vat.php',
  'multi-store-sync-for-woocommerce': 'wc-multi-store-sync/wc-multi-store-sync.php',
  'sku-auto-woocommerce': 'woocommerce-sku-auto/woocommerce-sku-auto.php',
  'smart-product-export-woo': 'smart-product-export/smart-product-export.php',
};
const plugins: Plugin[] = JSON.parse(await readFile('src/data/plugins.json', 'utf8'));
const previous: Entry[] = JSON.parse(await readFile('src/data/plugin-screenshots.json', 'utf8'));
const selection = process.env.SCREENSHOT_SELECTION || 'missing';
const catalog = plugins.filter((item) => item.category === 'plugin');
const selectedIds = selection.split(',').map((id) => id.trim()).filter(Boolean);
if (!['all', 'missing'].includes(selection)) {
  const unknown = selectedIds.filter((id) => !catalog.some((item) => item.id === id));
  if (!selectedIds.length || unknown.length) throw new Error(`Unknown plugin: ${unknown.join(', ') || selection}`);
}
const output = resolve('public/images/plugin-screenshots');
const imageAssets = resolve('src/assets/plugin-screenshots');
const targets: Plugin[] = [];
for (const plugin of catalog) {
  const existing = previous.find((item) => item.plugin === plugin.id);
  let exists = false;
  if (existing) { try { await Promise.all([access(join(output, `${plugin.id}.png`)), access(join(imageAssets, `${plugin.id}.png`))]); exists = true; } catch { /* regenerate missing file */ } }
  if (selection === 'all' || selectedIds.includes(plugin.id) || (selection === 'missing' && !exists)) targets.push(plugin);
}
const work = await mkdtemp(join(tmpdir(), 'openwp-screenshots-'));
const browser = await chromium.launch({ headless: true });
const generated: Entry[] = [];
const failures: Array<{ plugin: string; error: string }> = [];

async function stop(child: ReturnType<typeof spawn>) {
  if (child.pid) { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already stopped */ } }
  await new Promise<void>((done) => { if (child.exitCode !== null || child.signalCode !== null) done(); else { child.once('exit', () => done()); setTimeout(done, 5000).unref(); } });
}
async function ready(child: ReturnType<typeof spawn>) {
  await new Promise<void>((done, reject) => {
    const timer = setTimeout(() => reject(new Error('Playground did not start')), 180000);
    let output = '';
    child.stdout!.on('data', (chunk) => { const text = chunk.toString(); process.stdout.write(text); output += text; if (output.includes('Ready! WordPress is running')) { clearTimeout(timer); done(); } });
    child.stderr!.on('data', (chunk) => process.stderr.write(chunk));
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Playground exited with code ${code}`)); });
  });
}
async function openAdmin(page: Page, path: string) {
  const response = await page.goto(`http://127.0.0.1:9400${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (!response?.ok() || !new URL(page.url()).pathname.startsWith('/wp-admin/')) throw new Error(`Admin page unavailable: ${path}`);
}

try {
  for (const plugin of targets) {
    console.log(`\nGenerating ${plugin.id} (${generated.length + failures.length + 1}/${targets.length})`);
    const scenario = scenarios.find((item) => item.plugin === plugin.id);
    const needsWoo = Boolean(plugin.compatibility?.woocommerce || plugin.compatibility?.woocommerceTested) || /woocommerce|(?:^|[-\s])woo(?:[-\s]|$)/i.test([plugin.id, plugin.name, plugin.description, ...plugin.topics].join(' '));
    const dependencies = needsWoo ? [{ step: 'installPlugin', pluginData: { resource: 'wordpress.org/plugins', slug: 'woocommerce' }, options: { activate: true } }] : [];
    if (plugin.id === 'rank-math-automation-wp') dependencies.push({ step: 'installPlugin', pluginData: { resource: 'wordpress.org/plugins', slug: 'seo-by-rank-math' }, options: { activate: true } });
    const blueprint = join(work, 'blueprint.json');
    await writeFile(blueprint, JSON.stringify({ steps: [...dependencies, { step: 'installPlugin', pluginData: { resource: 'url', url: pluginDownloadUrl(plugin) }, options: { activate: true } }, { step: 'runPHP', code: `<?php require '/wordpress/wp-load.php'; wp_set_password('screenshot-password', 1);` }] }));
    const child = spawn('npx', ['--yes', '@wp-playground/cli@3.1.61', 'server', '--port=9400', '--workers=4', `--blueprint=${blueprint}`], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    try {
      await ready(child);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:9400/wp-login.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.locator('#user_login').fill('admin');
        await page.locator('#user_pass').fill('screenshot-password');
        await Promise.all([page.waitForURL('**/wp-admin/**', { timeout: 90000, waitUntil: 'domcontentloaded' }), page.locator('#wp-submit').click()]);
        let caption: string;
        if (scenario) {
          if (!scenario.path.startsWith('/wp-admin/')) throw new Error('Invalid scenario path');
          await openAdmin(page, scenario.path);
          const target = page.locator(scenario.selector).first();
          await target.waitFor({ state: 'visible', timeout: 20000 });
          await page.evaluate(() => { document.body.style.paddingBottom = '800px'; });
          await target.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 100));
          caption = scenario.caption;
        } else {
          // A conservative automatic fallback: only publish a screenshot when the
          // active plugin's own row can be identified on the Installed Plugins page.
          await openAdmin(page, '/wp-admin/plugins.php?plugin_status=active');
          const rows = page.locator('tr.active[data-plugin]');
          let target = null;
          for (let i = 0; i < await rows.count(); i++) {
            const row = rows.nth(i);
            const file = (await row.getAttribute('data-plugin') || '').toLowerCase();
            const title = (await row.locator('.plugin-title strong').innerText().catch(() => '')).trim().toLowerCase();
            if (file === installedPluginFiles[plugin.id] || file.split('/')[0] === plugin.id || file.split('/')[0].startsWith(`${plugin.id}-`) || title === plugin.name.toLowerCase()) { target = row; break; }
          }
          if (!target) { const installed = await rows.evaluateAll((items) => items.map((row) => row.getAttribute('data-plugin'))); throw new Error(`Could not identify the activated plugin on the Installed Plugins screen; active: ${installed.join(', ') || 'none'}`); }
          const activePluginFile = await target.getAttribute('data-plugin');
          const menuLabel = adminMenus[plugin.id];
          const menuHref = menuLabel ? await page.locator('#adminmenu a').evaluateAll((links, label) => {
            const match = links.find((link) => link.textContent?.trim().replace(/\s+/g, ' ').toLowerCase() === label.toLowerCase());
            return match?.getAttribute('href') || null;
          }, menuLabel) : null;
          let usedMenu = false;
          if (menuHref) {
            const url = new URL(menuHref, 'http://127.0.0.1:9400/wp-admin/');
            if (url.origin === 'http://127.0.0.1:9400' && url.pathname.startsWith('/wp-admin/')) {
              try {
                await openAdmin(page, url.pathname + url.search);
                await page.locator('#wpbody-content h1, #wpbody-content h2').first().waitFor({ state: 'visible', timeout: 10000 });
                usedMenu = true;
              } catch (error) { console.warn(`Could not open ${menuLabel}: ${error}; using installed plugins screen`); }
            }
          }
          if (usedMenu) {
            caption = `${plugin.name} in the WordPress dashboard`;
          } else {
            await openAdmin(page, '/wp-admin/plugins.php?plugin_status=active');
            const row = page.locator(`tr[data-plugin="${activePluginFile}"]`).first();
            await page.evaluate(() => { document.body.style.paddingBottom = '800px'; });
            await row.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 180));
            caption = `${plugin.name} activated in the WordPress plugins screen`;
          }
        }
        await page.screenshot({ path: join(work, `${plugin.id}.png`), animations: 'disabled' });
        generated.push({ plugin: plugin.id, src: `/images/plugin-screenshots/${plugin.id}.png`, caption });
      } finally { await context.close(); }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${plugin.id}: ${message}`);
      failures.push({ plugin: plugin.id, error: message });
    } finally { await stop(child); }
  }
  await mkdir(output, { recursive: true });
  await mkdir(imageAssets, { recursive: true });
  for (const entry of generated) await Promise.all([copyFile(join(work, `${entry.plugin}.png`), join(output, `${entry.plugin}.png`)), copyFile(join(work, `${entry.plugin}.png`), join(imageAssets, `${entry.plugin}.png`))]);
  const merged = new Map(previous.map((entry) => [entry.plugin, entry]));
  for (const entry of generated) merged.set(entry.plugin, entry);
  await writeFile('src/data/plugin-screenshots.json', JSON.stringify([...merged.values()].sort((a, b) => a.plugin.localeCompare(b.plugin)), null, 2) + '\n');
  await mkdir('screenshot-report', { recursive: true });
  await writeFile('screenshot-report/results.json', JSON.stringify({ selection, attempted: targets.length, generated: generated.map((entry) => entry.plugin), failures }, null, 2) + '\n');
  console.log(`Generated ${generated.length}/${targets.length}; ${failures.length} failed. Details: screenshot-report/results.json`);
  if (targets.length && !generated.length) process.exitCode = 1;
} finally { await browser.close(); await rm(work, { recursive: true, force: true }); }
