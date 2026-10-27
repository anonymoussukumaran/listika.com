import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://listika.com',
  output: 'static',
  integrations: [sitemap({ filter: (page) => new URL(page).pathname.replace(/\/$/, '') !== '/lists/kochi-running-events' })],
});
