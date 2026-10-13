# Open WP Club Website

The community website for [Open WP Club](https://openwpclub.com) - free, open-source WordPress plugins built by the community. Powered by [Astro](https://astro.build), Tailwind CSS v4, and published on GitHub Pages behind Cloudflare.

## Quick Start

### Prerequisites

- Node.js 24 or higher
- pnpm

### Installation

```bash
git clone https://github.com/Open-WP-Club/www.git
cd www
pnpm install
```

### Development

```bash
pnpm dev
```

The site will be available at `http://localhost:4321`.

### Build

```bash
pnpm build
pnpm preview   # preview the production build locally
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Build from the committed catalog data |
| `pnpm build:fresh` | Refresh GitHub data, then build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm fetch-data` | Fetch plugin + contributor data from GitHub and print a summary |
| `pnpm test` | Run unit tests |
| `pnpm check` | Run Astro and TypeScript checks |
| `pnpm check:links` | Validate built internal links and release downloads |
| `pnpm test:e2e` | Test the app catalog on desktop and mobile Chromium |

### Updating plugin data

`pnpm build` uses the committed catalog so builds stay reproducible and do not
depend on GitHub API availability. Use `pnpm build:fresh` when you intentionally
want to refresh first. The monthly GitHub Actions workflow refreshes and commits
the catalog on the first day of each month. App descriptions, platforms,
requirements, icons, and screenshots are maintained in `src/data/apps.json`;
repository versions and release assets continue to come from GitHub.

To check the data first without building:

```bash
pnpm fetch-data
```

For higher GitHub API rate limits (60/hr without, 5000/hr with):

```bash
GITHUB_TOKEN=ghp_xxx pnpm build:fresh
```

Install Chromium once before running the browser tests locally:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Central sponsorship

Edit `src/data/sponsorship.json` to manage supporters and campaigns. MGKNeT is
registered as a supporter. Each group has up to three active entries; dates use
UTC and `endsAt: null` means an ongoing sponsorship. Put approved PNG logos in
`public/images/sponsors/`.

`pnpm build` publishes `/sponsorship.json`, the shared README transparent light/dark banners and scoped
campaign banners. The site, READMEs and Plugin Hub all derive their recognition
from that registry. GitHub Sponsors imports in `src/data/sponsors.json` are a
separate funding snapshot and never automatically grant advertising rights.

Run `node scripts/sync-sponsorship-readmes.mjs --write /path/to/plugin-repo` once
to install the shared block in a repository. Later sponsor changes only require
updating this central site. Campaign entries can use `repositories: ["plugin-hub"]`
to restrict the repository placement; omit it or use `["*"]` for all plugins.

The organization catalog refresh imports this feed daily; Plugin Hub then
receives supporter thanks in its normal cached catalog request. Deploy this site
before publishing the catalog consumer and README blocks. The repository
inventory and integration patches are in `integrations/sponsorship/`.

### Scheduled sponsorship dates

The `Refresh sponsorship transitions` workflow checks dates every 15 minutes.
It commits a generated transition marker only when the active positions or the
registry change, then explicitly calls the Pages publishing workflow. This also
works for bot commits, which do not trigger ordinary push workflows. The
publishing workflow builds from committed data and requires no GitHub API access.
GitHub scheduling, deployment and image/CDN caches can delay public visibility.

`Supporter` has a name/link on the sponsors page. Only `Partner` and `Champion`
have website logos, README banners and Plugin Hub recognition. Champion sorts
before Partner. Logos are normalized to bounded PNGs before publication; long
banner names use two lines and an ellipsis. Source logos are limited to 5 MiB.

## Project Structure

```
src/
  components/    # Reusable Astro components (Nav, Footer, Sidebar, etc.)
  content/       # Content collections (blog posts, plugin data)
  layouts/       # Base layout with SEO, Open Graph, structured data
  lib/           # Config, GitHub API fetching, types
  pages/         # File-based routing (plugins, blog, contributors, etc.)
  styles/        # Global CSS (Tailwind v4)
scripts/         # Standalone utility scripts (fetch-data)
public/          # Static assets (favicon, OG image)
```

## Key Features

- Plugin catalog fetched from GitHub at build time (stats, READMEs)
- Blog with tag filtering and RSS feed
- Contributors page from GitHub API
- SEO: sitemap, structured data, Open Graph, Twitter Cards
- View Transitions (SPA-style navigation)
- Dark mode with system preference detection
- Published on GitHub Pages behind Cloudflare

<!-- OPENWPCLUB_SPONSORS_START -->
## Open-source supporters

These companies help keep Open WP Club plugins free and maintained.

<a href="https://openwpclub.com/sponsors/"><picture><source media="(prefers-color-scheme: dark)" srcset="https://openwpclub.com/sponsorship/supporters-dark.png"><img src="https://openwpclub.com/sponsorship/supporters.png" alt="Open WP Club supporters" width="960"></picture></a>

## Sponsored placements

Clearly labelled promotional campaigns, separate from our supporters.

<a href="https://openwpclub.com/advertise/"><picture><source media="(prefers-color-scheme: dark)" srcset="https://openwpclub.com/sponsorship/campaigns-dark.png"><img src="https://openwpclub.com/sponsorship/campaigns.png" alt="Open WP Club sponsored placements" width="960"></picture></a>

[Support our work](https://openwpclub.com/sponsors/) · [Discuss a campaign](https://openwpclub.com/advertise/)
<!-- OPENWPCLUB_SPONSORS_END -->

## License

MIT - see [LICENSE](LICENSE) for details.

## Community

- [GitHub](https://github.com/Open-WP-Club)
- [Discord](https://discord.gg/ysBW334DYR)
- Email: contact@openwpclub.com
