export interface SiteOwnedPage {
  project: string;
  href: string;
  label: string;
  order?: number;
  search: {
    title: string;
    description: string;
    tags: string[];
    text: string;
  };
}

export const SITE_OWNED_PAGES = [
  {
    project: 'adf4j',
    href: '/projects/adf4j/demo',
    label: 'Demo',
    order: 1000,
    search: {
      title: 'Demo · adf4j',
      description:
        'Try adf4j WASM with a public Confluence Cloud page URL and preview the Markdown output.',
      tags: ['adf4j', 'wasm', 'confluence', 'markdown'],
      text: 'Confluence Cloud ADF to Markdown browser demo adf4j-wasm convertJson',
    },
  },
] as const satisfies readonly SiteOwnedPage[];

export function siteOwnedNavFor(projectId: string) {
  return SITE_OWNED_PAGES.filter((page) => page.project === projectId);
}
