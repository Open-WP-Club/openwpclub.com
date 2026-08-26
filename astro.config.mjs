import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://openwpclub.com',
  trailingSlash: 'always',
  integrations: [sitemap(), icon({ iconDir: 'src/components/icons' })],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'tap',
  },
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
