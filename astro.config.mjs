// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://Diego303.github.io',
  base: '/sentinel-docs/',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
