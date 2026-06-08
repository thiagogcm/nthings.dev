import { getCollection } from 'astro:content';

export const getSortedPosts = async () => {
  return (await getCollection('blog')).toSorted(
    (a, b) => {
      return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
    },
  );
};

export const getSortedProjects = async () => {
  return (await getCollection('projects')).toSorted(
    (a, b) => {
      return a.data.order - b.data.order;
    },
  );
};
