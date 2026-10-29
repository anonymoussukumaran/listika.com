import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://listika.com',
  output: 'static',
  integrations: [sitemap({ filter: (page) => !['/lists/kochi-running-events', '/collections/kochi'].includes(new URL(page).pathname.replace(/\/$/, '')) })],
});
