const CONFLUENCE_HOST_RE = /^[a-z0-9-]+\.atlassian\.net$/i;
const PAGE_ID_RE = /\/pages\/(\d+)(?:\/|$)/;

export interface ConfluencePageResponse {
  title?: string;
  body?: {
    atlas_doc_format?: {
      value?: string;
    };
  };
}

export type ConfluenceParseResult =
  | { ok: true; origin: string; pageId: string }
  | { ok: false; error: string };

export function parseConfluencePageUrl(input: string): ConfluenceParseResult {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  if (url.protocol !== "https:") {
    return {
      ok: false,
      error: "Only HTTPS Confluence Cloud URLs are supported.",
    };
  }

  if (!CONFLUENCE_HOST_RE.test(url.hostname)) {
    return {
      ok: false,
      error: "Only Confluence Cloud sites (*.atlassian.net) are supported.",
    };
  }

  if (!url.pathname.startsWith("/wiki/")) {
    return { ok: false, error: "URL must be a Confluence wiki page link." };
  }

  const match = url.pathname.match(PAGE_ID_RE);
  if (!match) {
    return { ok: false, error: "Could not find a page ID in the URL." };
  }

  return { ok: true, origin: url.origin, pageId: match[1]! };
}

export function confluencePageApiUrl(origin: string, pageId: string): string {
  const api = new URL(`/wiki/api/v2/pages/${pageId}`, origin);
  api.searchParams.set("body-format", "atlas_doc_format");
  return api.toString();
}

export function extractAdfJson(page: ConfluencePageResponse): string | null {
  return page.body?.atlas_doc_format?.value ?? null;
}

export function friendlyConfluenceError(status: number): string {
  if (status === 401) {
    return "This page requires authentication. Only public Confluence Cloud pages are supported.";
  }
  if (status === 404) {
    return "Page not found or not publicly accessible.";
  }
  if (status === 403) {
    return "Access to this page is restricted.";
  }
  return `Confluence API returned status ${status}.`;
}
