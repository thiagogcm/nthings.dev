import { getCollection } from 'astro:content';

export interface ProjectNavItem {
  href: string;
  label: string;
  isOverview?: boolean;
}

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

export function projectDocUrl(docId: string): string {
  const [projectId, ...pageParts] = docId.split('/');
  if (pageParts.length === 0) {
    return `/projects/${projectId}`;
  }
  return `/projects/${projectId}/${pageParts.join('/')}`;
}

export function projectDocPageSlug(docId: string): string {
  const parts = docId.split('/');
  return parts.slice(1).join('/');
}

export async function getProjectDocPages(projectId: string) {
  const docs = await getCollection(
    'projectDocs',
    ({ data }) => data.project === projectId,
  );

  return docs.toSorted((a, b) => {
    if (a.data.order !== b.data.order) {
      return a.data.order - b.data.order;
    }
    return a.data.title.localeCompare(b.data.title);
  });
}

export async function getProjectNav(
  projectId: string,
  overviewLabel = 'Overview',
): Promise<ProjectNavItem[]> {
  const pages = await getProjectDocPages(projectId);
  if (pages.length === 0) {
    return [];
  }

  return [
    {
      href: `/projects/${projectId}`,
      label: overviewLabel,
      isOverview: true,
    },
    ...pages.map((page) => ({
      href: projectDocUrl(page.id),
      label: page.data.navTitle ?? page.data.title,
    })),
  ];
}
