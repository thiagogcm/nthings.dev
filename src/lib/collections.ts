import { getCollection } from 'astro:content';

/** Blog posts, newest first. */
export const getSortedPosts = async () =>
  (await getCollection('blog')).toSorted(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

/** Projects, by ascending `order`. */
export const getSortedProjects = async () =>
  (await getCollection('projects')).toSorted(
    (a, b) => a.data.order - b.data.order,
  );
