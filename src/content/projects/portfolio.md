---
title: "nthings.dev"
description: "A personal portfolio built as a technical documentation site — work is read as engineering reference, not browsed as a gallery."
repository: "https://github.com/thiagomoura/nthings.dev"
website: "https://nthings.dev"
order: 1
tags: ["astro", "cloudflare", "typescript"]
---

This site is the reference implementation of its own thesis: a portfolio that treats each
project as an engineering specification rather than a visual case study. It is intentionally
small, monochromatic, and content-first.

## Architecture

The site is a fully static Astro build with no client framework. Pages are composed from a
two-layer layout system:

- `BaseLayout` owns the document head, header, and footer.
- `DocsLayout` wraps `BaseLayout` and adds the three-column documentation grid: a global
  navigation sidebar, the longform content column, and an in-page table of contents.

Content lives in two Markdown collections — `projects` and `blog` — typed and validated through
Astro content collections. Every project and post is pre-rendered at build time, so the deployed
output is plain HTML and CSS with zero runtime JavaScript beyond view transitions.

## Tech Stack

| Layer     | Choice                          |
| --------- | ------------------------------- |
| Framework | Astro 6                         |
| Language  | TypeScript (strict)             |
| Styling   | Tailwind v4 (CSS-first `@theme` tokens) |
| Content   | Markdown content collections    |
| Hosting   | Cloudflare Workers via Wrangler |
| Fonts     | Inter, JetBrains Mono           |

There is no CSS-in-JS and no CMS. Styling is Tailwind v4 in CSS-first mode: a single `@theme` token
sheet drives a monochrome palette, with light and dark variants resolved through `light-dark()` and
an optional explicit theme toggle.

## Code

Content schemas are declared once and reused across listing and detail pages:

```ts
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    repository: z.url().optional(),
    website: z.url().optional(),
    order: z.number().default(0),
    tags: z.array(z.string()).optional(),
  }),
});
```

The in-page outline is derived directly from the rendered Markdown headings, so the right rail
always matches the document without any manual bookkeeping:

```astro
const { Content, headings } = await render(project);
```

That single source of truth is what lets the blog and project specs share the exact same
documentation layout.
