import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://nthings.dev',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    syntaxHighlight: 'prism',
    processor: unified({
      smartypants: {
        dashes: 'oldschool',
      },
    }),
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-body',
      weights: [400, 500, 600, 700],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-code',
      weights: [400, 500],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
