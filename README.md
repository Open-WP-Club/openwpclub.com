# Open WP Club Website

The community website for [Open WP Club](https://openwpclub.com) - free, open-source WordPress plugins built by the community. Powered by [Astro](https://astro.build), Tailwind CSS v4, and deployed on Cloudflare Workers.

## Quick Start

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Installation

```bash
git clone https://github.com/Open-WP-Club/www.git
cd www
npm install
```

### Development

```bash
npm run dev
```

The site will be available at `http://localhost:4321`.

### Build

```bash
npm run build
npm run preview   # preview the production build locally
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (fetches latest data from GitHub) |
| `npm run preview` | Preview production build locally |
| `npm run fetch-data` | Fetch plugin + contributor data from GitHub and print a summary |
| `npm run refresh` | Fetch data summary + build in one step |
| `npm run test` | Run unit tests |

### Updating plugin data

Plugin and contributor data is fetched from GitHub at build time. To refresh:

```bash
npm run refresh
```

Or to check the data first without building:

```bash
npm run fetch-data
```

For higher GitHub API rate limits (60/hr without, 5000/hr with):

```bash
GITHUB_TOKEN=ghp_xxx npm run refresh
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
