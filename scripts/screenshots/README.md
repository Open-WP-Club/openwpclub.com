# Plugin screenshots

The **Generate plugin screenshots** GitHub Actions workflow runs only on demand. In Actions, select the workflow, choose **Run workflow**, and enter one of:

- `missing` (default): generate only catalog plugins without a saved image;
- `all`: regenerate every catalog plugin;
- a plugin slug, such as `stageguard`, or comma-separated slugs: generate only those plugins.

The same modes work locally with `SCREENSHOT_SELECTION=stageguard pnpm exec tsx scripts/screenshots/generate.ts`. Install Chromium with `pnpm exec playwright install chromium`. Node 24 and network access are required; the script uses pinned Playground CLI 3.1.61 via npx.

Each plugin runs in its own temporary WordPress Playground. The script installs its catalog ZIP and, when its name, description or topics mention WooCommerce, also installs WooCommerce. It logs into the temporary site and verifies activation. No real site data is used. For an explicitly configured scenario in `config.json`, it opens and verifies the specified screen. For plugins listed in `admin-menus.json`, it tries to open the corresponding admin menu. Otherwise, or if that menu is unavailable, it captures the verified active plugin on the Installed Plugins screen. This fallback is labelled as such; it does not claim to show the plugin's features.

A feature screenshot may require plugin-specific dependencies, sample data, or steps beyond this automatic setup. Add a verified scenario as appropriate. Plugins that cannot be installed, activated, or identified are reported rather than given a misleading image. Failures do not prevent other plugins from being processed; existing screenshots remain unchanged. The workflow uploads `screenshot-report/results.json`, images, and the updated manifest as artifacts. Review the images and report, then add the approved files and manifest to the repository to publish them. If every attempted plugin fails, the run fails and the previous images remain intact. If nothing is missing, the run has no images to generate.
