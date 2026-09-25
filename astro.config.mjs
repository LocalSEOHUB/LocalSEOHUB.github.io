// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages USER site: the repo is named <user>.github.io and is served from the
// domain root, so there is no base path. `base` is left at its default of '/'.
// src/lib/url.ts still mediates every internal link, so the site can move back under
// a sub-path (or onto a custom domain) by changing `site`/`base` here and nothing else.
export default defineConfig({
  site: 'https://localseohub.github.io',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // /search/ is a client-side tool, not content, and is marked noindex.
      filter: (page) => !page.endsWith('/search/'),
    }),
  ],
  image: {
    // Remote featured images (a pasted stock-photo URL, say) are downloaded at
    // build time, resized and served from this origin — so they get the same
    // treatment as local uploads and cost the reader no third-party request.
    remotePatterns: [{ protocol: 'https' }],
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});
