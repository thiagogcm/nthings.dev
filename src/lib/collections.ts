import { getCollection } from 'astro:content';

export const getSortedPosts = async () =>
  (await getCollection('blog')).toSorted(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

export const getSortedProjects = async () =>
  (await getCollection('projects')).toSorted(
    (a, b) => a.data.order - b.data.order,
  );
