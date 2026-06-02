import { createHash } from 'node:crypto';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { UI_INIT_SCRIPT } from './src/lib/theme-init.ts';

// CSP is enabled below. Astro auto-hashes processed <script>/<style> tags, but NOT
// `is:inline` scripts — so we compute the SHA-256 of the one inline init script
// (theme + sidebar state, see src/lib/theme-init.ts) and add it to script-src here.
// Derived from the script's exact bytes, so it stays correct whenever the script changes.
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
