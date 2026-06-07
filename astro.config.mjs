import { createHash } from 'node:crypto';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { UI_INIT_SCRIPT } from './src/lib/theme-init.ts';

// Astro auto-hashes processed scripts for CSP but not is:inline ones, so we hash the
// inline theme init (src/lib/theme-init.ts) from its bytes and allowlist it here.
const uiInitScriptHash =
  'sha256-' + createHash('sha256').update(UI_INIT_SCRIPT).digest('base64');

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
  security: {
    csp: {
      scriptDirective: {
        hashes: [uiInitScriptHash],
      },
    },
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
