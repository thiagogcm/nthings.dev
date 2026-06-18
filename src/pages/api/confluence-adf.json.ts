import type { APIRoute } from 'astro';
import {
  confluencePageApiUrl,
  extractAdfJson,
  friendlyConfluenceError,
  parseConfluencePageUrl,
  type ConfluencePageResponse,
} from '../../lib/confluence';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const pageUrl = url.searchParams.get('url');
  if (!pageUrl) {
    return Response.json({ error: 'Missing url query parameter.' }, { status: 400 });
  }

  const parsed = parseConfluencePageUrl(pageUrl);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(confluencePageApiUrl(parsed.origin, parsed.pageId), {
      headers: { Accept: 'application/json' },
    });
  } catch {
    return Response.json(
      { error: 'Could not reach Confluence. Check the URL and try again.' },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return Response.json(
      { error: friendlyConfluenceError(response.status) },
      { status: response.status },
    );
  }

  let page: ConfluencePageResponse;
  try {
    page = (await response.json()) as ConfluencePageResponse;
  } catch {
    return Response.json({ error: 'Confluence returned an invalid response.' }, { status: 502 });
  }

  const adfJson = extractAdfJson(page);
  if (!adfJson) {
    return Response.json(
      { error: 'Page body does not include Atlas Doc Format (ADF) content.' },
      { status: 422 },
    );
  }

  return Response.json({
    title: page.title ?? 'Untitled page',
    adfJson,
  });
};
