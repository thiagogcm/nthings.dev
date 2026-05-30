---
title: "Building a portfolio as a documentation site"
description: "Why I rebuilt nthings.dev to read like an engineering spec — and the layout decisions that make project work and writing share one format."
pubDate: "2026-03-16"
tags: ["astro", "design-systems", "writing"]
---

Most portfolios are galleries. You scroll, you skim thumbnails, you maybe click through to a
case study that has been art-directed to within an inch of its life. I wanted the opposite: a
place where work is _read_, where each project is a reference document you could hand to another
engineer.

So I rebuilt this site as a technical documentation site.

## The thesis

A documentation layout makes a strong claim — that the substance of the work is the architecture,
the stack, and the code decisions, not the screenshots. Treating projects this way forces a
useful kind of honesty. If a project cannot be written up as a spec, it probably is not worth
showing.

The same format then absorbs the blog for free. Deep dives, post-mortems, and innovation
spotlights are just more documents in the same system, not a bolted-on "news" section.

## The layout

Every content page renders through one three-column grid:

- a left sidebar for navigating the whole directory of projects and posts,
- a center column tuned purely for reading,
- a right rail that mirrors the current document's headings.

```text
[ nav ]   [ longform content ]   [ on this page ]
```

Because the right rail is generated from the rendered Markdown headings, the outline is never out
of sync with the prose. Writing a new section is the only step required to update navigation.

## Constraints as design

The palette is monochrome on purpose. Stripping out accent color removes the easiest crutch for
creating hierarchy and forces typography, spacing, and weight to do the work instead. Inter for
everything, generous whitespace, and a strict heading scale — a library, not a gallery.

The result is a site that is fast, quiet, and durable: static HTML, no runtime framework, and a
format that scales to as many projects and posts as I care to document.
