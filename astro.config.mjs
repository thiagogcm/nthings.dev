import cloudflare from "@astrojs/cloudflare";
import adf4jWasm from "@nthings.dev/adf4j-wasm/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  site: "https://nthings.dev",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    // No images to optimize; passthrough avoids the Cloudflare IMAGES binding.
    imageService: "passthrough",
  }),
  vite: {
    plugins: [tailwindcss(), adf4jWasm()],
  },
  markdown: {
    // Default processor is Sätteri (GFM, SmartyPants, heading IDs applied automatically).
    syntaxHighlight: "shiki",
    // Dual themes: light colors inline, dark swapped via --shiki-dark in global.css.
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-body",
      weights: [400, 500, 600, 700],
      subsets: ["latin"],
      fallbacks: ["system-ui", "-apple-system", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-code",
      weights: [400, 500],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
});
