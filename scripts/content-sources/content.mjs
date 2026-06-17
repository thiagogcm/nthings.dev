import { glob, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export async function collectMarkdownFiles(dir) {
  const relativePaths = await Array.fromAsync(glob("**/*.md", { cwd: dir }));
  return relativePaths
    .filter((rel) => !path.basename(rel).startsWith("_"))
    .map((rel) => path.join(dir, rel));
}

export async function readMarkdown(file) {
  const raw = await readFile(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  return match
    ? { data: parseYaml(match[1]) ?? {}, body: match[2].trimStart() }
    : { data: {}, body: raw.trimStart() };
}

export async function writeMarkdown(file, data, body) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    `---\n${stringifyYaml(data, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.trimStart()}`,
    "utf8",
  );
}

export function validateBlogPost(data, context) {
  const errors = validateSharedFields(data, context);

  if (!data.pubDate) {
    errors.push(`${context}: frontmatter requires "pubDate"`);
  } else if (Number.isNaN(Date.parse(String(data.pubDate)))) {
    errors.push(`${context}: "pubDate" must be a valid date`);
  }
  if (data.updatedDate !== undefined && Number.isNaN(Date.parse(String(data.updatedDate)))) {
    errors.push(`${context}: "updatedDate" must be a valid date`);
  }

  return errors;
}

export function validateSharedFields(data, context) {
  const errors = [];

  if (!data.title || typeof data.title !== "string") {
    errors.push(`${context}: frontmatter requires "title"`);
  }
  if (!data.description || typeof data.description !== "string") {
    errors.push(`${context}: frontmatter requires "description"`);
  }
  if (data.repository !== undefined && !isHttpUrl(data.repository)) {
    errors.push(`${context}: "repository" must be a valid URL`);
  }
  if (data.website !== undefined && !isHttpUrl(data.website)) {
    errors.push(`${context}: "website" must be a valid URL`);
  }
  if (data.order !== undefined && typeof data.order !== "number") {
    errors.push(`${context}: "order" must be a number`);
  }
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    errors.push(`${context}: "tags" must be an array`);
  }

  return errors;
}

export function normalizePageOrder(pageOrder, context) {
  if (pageOrder === undefined) {
    return [];
  }
  if (!Array.isArray(pageOrder)) {
    throw new Error(`${context}: "pageOrder" must be an array`);
  }

  const slugs = [];
  const seen = new Set();

  for (const entry of pageOrder) {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new Error(`${context}: "pageOrder" entries must be non-empty strings`);
    }

    const pageSlug = entry.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\.md$/i, "");
    if (seen.has(pageSlug)) {
      throw new Error(`${context}: duplicate pageOrder entry "${pageSlug}"`);
    }
    seen.add(pageSlug);
    slugs.push(pageSlug);
  }

  return slugs;
}

export function normalizeImportedBody(body, slug) {
  return rewriteDocLinks(rewriteAssetPaths(stripTableOfContents(body), slug), slug);
}

export function rewriteAssetPaths(body, slug) {
  return body.replace(/(\]\()(\.\/)?assets\//g, `$1/content-sources/${slug}/`);
}

export function rewriteDocLinks(body, projectSlug) {
  return body.replace(/(\]\()([^)]+)(\))/g, (match, prefix, url, suffix) => {
    if (/^(https?:|mailto:|tel:|#|\/)/.test(url) || url.includes("assets/")) {
      return match;
    }

    const hashIndex = url.indexOf("#");
    const pathPart = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";

    if (!/\.md$/i.test(pathPart)) {
      return match;
    }

    const normalized = pathPart.replace(/^\.\//, "");
    if (normalized === "project.md") {
      return `${prefix}/projects/${projectSlug}${hash}${suffix}`;
    }

    return `${prefix}/projects/${projectSlug}/${normalized.replace(/\.md$/i, "")}${hash}${suffix}`;
  });
}

export function inferTitle(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

export function normalizeDocTitle(title, projectSlug) {
  const pattern = new RegExp(`^${escapeRegExp(projectSlug)}\\s*(?:[-—:|/])\\s*(.+)$`, "i");
  const match = title.match(pattern);
  return match?.[1]?.trim() || title;
}

export function stripLeadingH1(body) {
  return body.replace(/^#\s+.+(?:\r?\n|$)(?:\r?\n)?/, "").trimStart();
}

export function stripTableOfContents(body) {
  const lines = body.split(/\r?\n/);
  const ranges = [];

  for (let index = 0; index < lines.length; index += 1) {
    const heading = parseAtxHeading(lines[index]);
    if (!heading || !isTableOfContentsHeading(heading.text)) {
      continue;
    }

    let end = lines.length;
    for (let next = index + 1; next < lines.length; next += 1) {
      const nextHeading = parseAtxHeading(lines[next]);
      if (nextHeading && nextHeading.depth <= heading.depth) {
        end = next;
        break;
      }
    }

    ranges.push([index, end]);
    index = end - 1;
  }

  if (ranges.length === 0) {
    return body;
  }

  return lines
    .filter((_, index) => !ranges.some(([start, end]) => index >= start && index < end))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}

export function omit(data, keys) {
  const next = { ...data };
  for (const key of keys) delete next[key];
  return next;
}

function parseAtxHeading(line) {
  const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
  if (!match) {
    return null;
  }
  return {
    depth: match[1].length,
    text: match[2].trim(),
  };
}

function isTableOfContentsHeading(text) {
  const normalized = text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  return normalized === "table of contents" || normalized === "contents" || normalized === "toc";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
