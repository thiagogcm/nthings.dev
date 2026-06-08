import rss from '@astrojs/rss';
import { SITE } from '../consts';
import { getSortedPosts } from '../lib/collections';

export async function GET(context: { site?: URL }) {
  const posts = await getSortedPosts();
  const items = posts
    .map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    }));

  return rss({
    title: `${SITE.title} RSS Feed`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items,
  });
}
