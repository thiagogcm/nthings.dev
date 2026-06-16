import type { MarkdownHeading } from 'astro';

// `/` matches only `/`; `exact` matches the page itself; otherwise the section
// and its descendants match.
export function isActive(pathname: string, href: string, exact = false): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  if (exact) {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const tocHeadings = (headings: MarkdownHeading[]) => {
  return headings.filter((h) => {
    return h.depth > 1 && h.depth < 4;
  });
};

export function isNavItemActive(
  pathname: string,
  href: string,
  isOverview = false,
): boolean {
  if (isOverview) {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
