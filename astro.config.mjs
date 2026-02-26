import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';

export default defineConfig({
  site: 'https://eduardoborges.dev',
  output: 'static',
  compressHTML: true,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
    },
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },
});
