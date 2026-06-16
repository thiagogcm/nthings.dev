import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

function idFromFilename({ entry }: { entry: string }) {
  const name = entry.split('/').pop() ?? entry;
  return name.replace(/\.md$/i, '');
}

function projectDocIdFromEntry({ entry }: { entry: string }) {
  const normalized = entry.replace(/\\/g, '/');
  const marker = 'project-docs/';
  const idx = normalized.indexOf(marker);
  const rel = idx >= 0 ? normalized.slice(idx + marker.length) : normalized;
  return rel.replace(/\.md$/i, '');
}

const blog = defineCollection({
  loader: glob({
    pattern: [
      'src/content/blog/**/*.md',
      '.cache/content-sources/blog/**/*.md',
    ],
    base: './',
    generateId: idFromFilename,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    project: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({
    pattern: [
      'src/content/projects/**/*.md',
      '.cache/content-sources/projects/**/*.md',
    ],
    base: './',
    generateId: idFromFilename,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    repository: z.url().optional(),
    website: z.url().optional(),
    order: z.number().default(0),
    tags: z.array(z.string()).optional(),
  }),
});

const projectDocs = defineCollection({
  loader: glob({
    pattern: ['.cache/content-sources/project-docs/**/*.md'],
    base: './',
    generateId: projectDocIdFromEntry,
  }),
  schema: z.object({
    project: z.string(),
    title: z.string(),
    description: z.string().default(''),
    navTitle: z.string().optional(),
    order: z.number().default(0),
    sourcePath: z.string().optional(),
  }),
});

export const collections = { blog, projects, projectDocs };
