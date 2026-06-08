import type { APIRoute } from "astro";
import { NAV_LINKS } from "../consts";
import { getSortedPosts, getSortedProjects } from "../lib/collections";

// Nav entries whose href is a collection index — covered by per-entry docs below.
const COLLECTION_ROOTS = new Set(["/projects", "/blog"]);

// Prebuilt static search index — shipped as a single JSON file so the client
// fetches it once and searches entirely in memory (no server round-trips).
export const prerender = true;

/** Roughly strip Markdown to plain text for the search body. */
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
  const [posts, projects] = await Promise.all([
    getSortedPosts(),
    getSortedProjects(),
  ]);

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
