# Open WP Club Website

The community website for [Open WP Club](https://openwpclub.com) - free, open-source WordPress plugins built by the community. Powered by [Astro](https://astro.build), Tailwind CSS v4, and deployed on Cloudflare Workers.

## Quick Start

### Prerequisites

- Node.js 22.12 or higher
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
| `pnpm build` | Build for production (fetches latest data from GitHub) |
| `pnpm preview` | Preview production build locally |
| `pnpm fetch-data` | Fetch plugin + contributor data from GitHub and print a summary |
| `pnpm test` | Run unit tests |
| `pnpm check` | Run Astro and TypeScript checks |
| `pnpm check:links` | Validate built internal links and release downloads |
| `pnpm test:e2e` | Test the app catalog on desktop and mobile Chromium |

### Updating plugin data

`pnpm build` fetches the latest data from GitHub automatically before building.
The monthly GitHub Actions workflow refreshes and commits the catalog on the
first day of each month. App descriptions, platforms, requirements, icons, and
screenshots are maintained in `src/data/apps.json`; repository versions and
release assets continue to come from GitHub.

To check the data first without building:

```bash
pnpm fetch-data
```

For higher GitHub API rate limits (60/hr without, 5000/hr with):

```bash
GITHUB_TOKEN=ghp_xxx pnpm build
```

Install Chromium once before running the browser tests locally:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

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
- Deployed to Cloudflare Workers ($0/month)

## License

MIT - see [LICENSE](LICENSE) for details.

## Community

- [GitHub](https://github.com/Open-WP-Club)
- [Discord](https://discord.gg/ESTDmmjj)
- Email: contact@openwpclub.com
