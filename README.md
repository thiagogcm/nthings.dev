# nthings.dev

Personal site of Thiago Moura, built as a technical documentation site — projects and
writing are *read* as engineering reference, not browsed as a gallery. Fully static
output, no client framework, deployed to Cloudflare Workers.

## Stack

| Layer     | Choice                                                   |
| --------- | -------------------------------------------------------- |
| Framework | [Astro 6](https://astro.build) (static output)          |
| Language  | TypeScript (strict)                                      |
| Styling   | Tailwind v4, CSS-first `@theme` tokens + `light-dark()`  |
| Content   | Markdown content collections (`blog`, `projects`)        |
| Search    | Prebuilt static JSON index, searched client-side         |
| Hosting   | Cloudflare Workers via Wrangler                          |
| Fonts     | Inter + JetBrains Mono via the Astro Fonts API           |

The only runtime JavaScript is Astro view transitions plus small progressive-enhancement
scripts (theme toggle, command-palette search, ToC scroll-spy, heading permalinks). Code
blocks are highlighted at build time with Shiki (dual light/dark themes, no shipped CSS).

A Cloudflare cron Worker refreshes GitHub stats every 6h into KV; the homepage reads that
cache through a deferred server island (`StatusIsland`).

## Project structure

```text
src/
├── components/      UI: header, drawer, search, nav, ToC, icons, status island
├── content/         Markdown collections — blog/ and projects/
├── layouts/         BaseLayout (head + chrome) → DocsLayout (3-column docs grid)
├── lib/             collections, nav helpers, date format, github-stats
├── pages/           routes + search.json.ts
├── styles/          global.css — design tokens and component CSS
└── worker.ts        Cloudflare entrypoint (fetch + scheduled cron)
```

## Commands

| Command           | Action                                          |
| :---------------- | :---------------------------------------------- |
| `npm run dev`     | Start the local dev server                      |
| `npm run build`   | Build the static site to `./dist/`              |
| `npm run preview` | Preview the production build locally            |
| `npm run check`   | Type-check `.astro`/`.ts` with `astro check`    |

## Deployment

Pushed to Cloudflare Workers via Wrangler (see `wrangler.jsonc`). The GitHub stats Worker
needs a `GITHUB_STATS` KV namespace and an optional `GITHUB_TOKEN` secret for higher rate
limits.
