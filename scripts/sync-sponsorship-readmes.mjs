import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const start = '<!-- OPENWPCLUB_SPONSORS_START -->';
const end = '<!-- OPENWPCLUB_SPONSORS_END -->';
export const sponsorshipBlock = `${start}\n## Open-source supporters\n\nThese companies help keep Open WP Club plugins free and maintained.\n\n[![Open WP Club supporters](https://openwpclub.com/sponsorship/supporters.png)](https://openwpclub.com/sponsors/)\n\n## Sponsored placements\n\nClearly labelled promotional campaigns, separate from our supporters.\n\n[![Open WP Club sponsored placements](https://openwpclub.com/sponsorship/campaigns.png)](https://openwpclub.com/advertise/)\n\n[Support our work](https://openwpclub.com/sponsors/) · [Discuss a campaign](https://openwpclub.com/advertise/)\n${end}`;
export function updateReadme(text, repository) {
  const block = repository ? sponsorshipBlock.replace('https://openwpclub.com/sponsorship/campaigns.png', `https://openwpclub.com/sponsorship/repos/${encodeURIComponent(repository.toLowerCase())}/campaigns.png`) : sponsorshipBlock;
  const begins = text.split(start).length - 1;
  const ends = text.split(end).length - 1;
  if (begins !== ends || begins > 1) throw new Error('Ambiguous sponsorship markers; review README manually');
  if (begins) {
    const a = text.indexOf(start), b = text.indexOf(end);
    if (b < a) throw new Error('Reversed sponsorship markers');
    return text.slice(0, a) + block + text.slice(b + end.length);
  }
  // Installation and usage stay first; add recognition before project maintenance sections.
  const position = text.search(/^##\s+(?:Contributing|Development|Credits|License|Support)\b/im);
  if (position >= 0) return text.slice(0, position).trimEnd() + '\n\n' + block + '\n\n' + text.slice(position);
  return text.trimEnd() + '\n\n' + block + '\n';
}
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const write = process.argv.includes('--write');
  const dirs = process.argv.slice(2).filter((arg) => arg !== '--write');
  if (!dirs.length) throw new Error('Pass explicit repository directories; add --write to apply changes');
  for (const dir of dirs) {
    const files = await readdir(dir);
    if (files.includes('AGENTS.md')) throw new Error(`Read ${dir}/AGENTS.md before updating this repository`);
    const name = files.find((file) => file.toLowerCase() === 'readme.md');
    if (!name) { console.log(`Skipped ${dir}: no Markdown README`); continue; }
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: dir, encoding: 'utf8' }).trim();
    const match = /(?:github\.com[/:])Open-WP-Club\/([^/]+)$/i.exec(remote);
    if (!match) throw new Error(`${dir} is not an Open-WP-Club GitHub checkout`);
    const repository = match[1].replace(/\.git$/i, '');
    const scope = repository === 'openwpclub.com' || repository === '.github' ? undefined : repository;
    const file = resolve(dir, name), before = await readFile(file, 'utf8'), after = updateReadme(before, scope);
    if (before === after) continue;
    if (write) await writeFile(file, after);
    console.log(`${write ? 'Updated' : 'Would update'} ${file}`);
  }
}
