import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { NAV_LINKS } from "../consts";
import { getSortedPosts, getSortedProjects, projectDocUrl } from "../lib/collections";

// Collection index routes — covered by their per-entry docs below.
const COLLECTION_ROOTS = new Set(["/projects", "/blog"]);

// Prebuilt static index: one JSON file the client fetches once and searches in memory.
export const prerender = true;

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → label
    .replace(/^\s{0,3}>+\s?/gm, " ") // blockquotes
    .replace(/^[#>\-*+]+\s?/gm, " ") // list/heading markers
    .replace(/[*_~#>|]/g, " ") // residual emphasis/table punctuation
    .replace(/\s+/g, " ")
    .trim();
}

interface SearchDoc {
  title: string;
  url: string;
  section: string;
  description: string;
  tags: string[];
  text: string;
}

export const GET: APIRoute = async () => {
  const [posts, projects, projectDocs] = await Promise.all([
    getSortedPosts(),
    getSortedProjects(),
    getCollection("projectDocs"),
  ]);

  const projectsById = new Map(projects.map((project) => [project.id, project]));

  // Static pages (Home, About) — sourced from the nav so they never drift.
  const pages: SearchDoc[] = NAV_LINKS.filter(
    (link) => !COLLECTION_ROOTS.has(link.href),
  ).map((link) => ({
    title: link.label,
    url: link.href,
    section: "Pages",
    description: link.description,
    tags: [],
    text: "",
  }));

  const docs: SearchDoc[] = [
    ...pages,
    ...projects.map((project) => ({
      title: project.data.title,
      url: `/projects/${project.id}`,
      section: "Projects",
      description: project.data.description,
      tags: [...(project.data.tags ?? [])],
      text: stripMarkdown(project.body ?? "").slice(0, 1500),
    })),
    ...projectDocs.map((doc) => {
      const project = projectsById.get(doc.data.project);
      return {
        title: project
          ? `${doc.data.title} · ${project.data.title}`
          : doc.data.title,
        url: projectDocUrl(doc.id),
        section: "Projects",
        description: doc.data.description || project?.data.description || "",
        tags: [...(project?.data.tags ?? [])],
        text: stripMarkdown(doc.body ?? "").slice(0, 1500),
      };
    }),
    ...posts.map((post) => ({
      title: post.data.title,
      url: `/blog/${post.id}`,
      section: "Blog",
      description: post.data.description,
      tags: [...(post.data.tags ?? [])],
      text: stripMarkdown(post.body ?? "").slice(0, 1500),
    })),
  ];

  return new Response(JSON.stringify(docs), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
