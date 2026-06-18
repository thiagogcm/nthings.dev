import type { CollectionEntry } from "astro:content";
import { siteOwnedNavFor } from "./site-owned-pages";

export interface EntryAction {
  href: string;
  label: string;
  external?: boolean;
}

export function projectActions(project: CollectionEntry<"projects">) {
  const actions: EntryAction[] = [
    {
      href: `/projects/${project.id}`,
      label: "Docs",
    },
  ];

  actions.push(
    ...siteOwnedNavFor(project.id)
      .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((page) => ({
        href: page.href,
        label: page.label,
      })),
  );

  if (project.data.website) {
    actions.push({
      href: project.data.website,
      label: "Live",
      external: true,
    });
  }

  if (project.data.repository) {
    actions.push({
      href: project.data.repository,
      label: "Source",
      external: true,
    });
  }

  return actions;
}
