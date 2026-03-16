import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export async function GET(context: { site?: URL }) {
  const posts = await getCollection('blog');
  const items = posts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
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
