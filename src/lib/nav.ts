import type { MarkdownHeading } from 'astro';

/**
 * Whether `href` is the active route for `pathname`.
 * `/` only matches `/`; with `exact`, only the page itself (and its trailing
 * slash) matches; otherwise the section and its descendants match.
 */
export function isActive(pathname: string, href: string, exact = false): boolean {
  if (href === '/') return pathname === '/';
  if (exact) return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Headings that belong in the on-page table of contents (h2–h3). */
export const tocHeadings = (headings: MarkdownHeading[]) =>
  headings.filter((h) => h.depth > 1 && h.depth < 4);
