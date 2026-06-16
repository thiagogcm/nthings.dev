import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import degit from "degit";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_DIR = path.join(ROOT, ".cache/content-sources");
const SOURCE_DIR = path.join(CACHE_DIR, "sources");
const PROJECTS_DIR = path.join(CACHE_DIR, "projects");
const BLOG_DIR = path.join(CACHE_DIR, "blog");
const PUBLIC_ASSETS_DIR = path.join(ROOT, "public/content-sources");
const validateOnly = process.argv.includes("--validate-only");

async function main() {
  const manifest = await readYaml(path.join(ROOT, "content-sources.yaml"));

  if (!Array.isArray(manifest.sources)) {
    throw new Error("content-sources.yaml must define a sources array");
  }

  if (!validateOnly) {
    await resetOutput();
  }

  const lock = await syncSources(manifest);

  if (validateOnly) {
    console.log("All configured sources are valid.");
    return;
  }

  await writeFile(path.join(CACHE_DIR, "lock.json"), `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  console.log(`Synced ${lock.sources.length} source(s) to ${path.relative(ROOT, CACHE_DIR)}`);
}

async function resetOutput() {
  await rm(CACHE_DIR, { recursive: true, force: true });
  await rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true });
  await mkdir(SOURCE_DIR, { recursive: true });
  await mkdir(PROJECTS_DIR, { recursive: true });
  await mkdir(BLOG_DIR, { recursive: true });
}

async function syncSources(manifest) {
  const defaults = {
    branch: manifest.defaults?.branch ?? "main",
    docRoot: manifest.defaults?.docRoot ?? "docs",
  };
  const slugs = new Set();
  const lock = { syncedAt: new Date().toISOString(), sources: [] };

  for (const source of manifest.sources) {
    const branch = source.branch ?? defaults.branch;
    const docRoot = source.docRoot ?? defaults.docRoot;
    const context = `${source.owner}/${source.repo}`;
    const docDir = await fetchDocRoot(source, branch, docRoot);
    const meta = await readOptionalYaml(path.join(docDir, "nthings.meta.yaml"));
    const slug = meta.slug ?? source.slug ?? source.repo;

    if (slugs.has(slug)) {
      throw new Error(`Duplicate slug "${slug}" from ${context}`);
    }
    slugs.add(slug);

    if (meta.include?.project ?? true) {
      await ingestProject({ docDir, context, source, slug, order: meta.order ?? source.order });
    }

    await ingestPosts({
      docDir,
      context,
      repo: source.repo,
      slug,
      include: meta.include?.posts ?? "posts/**/*.md",
      exclude: meta.exclude ?? [],
    });

    lock.sources.push({ owner: source.owner, repo: source.repo, slug, branch, docRoot, local: !!source.local });
  }

  return lock;
}

async function fetchDocRoot(source, branch, docRoot) {
  if (source.local) {
    const localDocDir = path.join(ROOT, docRoot);
    await assertDirectory(localDocDir, `local ${docRoot}/`);
    return localDocDir;
  }

  const repoDir = path.join(SOURCE_DIR, sanitize(`${source.owner}-${source.repo}`));
  const emitter = degit(`${source.owner}/${source.repo}#${branch}`, {
    cache: true,
    force: true,
    mode: "git",
    verbose: false,
  });

  emitter.on("warn", (event) => console.warn(event.message));
  await emitter.clone(repoDir);

  const docDir = path.join(repoDir, docRoot);
  await assertDirectory(docDir, `${source.owner}/${source.repo}/${docRoot}`);
  return docDir;
}

async function ingestProject({ docDir, context, source, slug, order }) {
  const markdown = await readMarkdown(path.join(docDir, "project.md")).catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`${context}: missing required project.md in docRoot`);
    }
    throw error;
  });
  const errors = validateSharedFields(markdown.data, `${context} project.md`);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const data = omit(
    {
      ...markdown.data,
      repository: markdown.data.repository ?? `https://github.com/${source.owner}/${source.repo}`,
      order: markdown.data.order ?? order ?? 0,
    },
    ["slug"],
  );

  if (!validateOnly) {
    await copyAssets(docDir, slug);
    await writeMarkdown(path.join(PROJECTS_DIR, `${slug}.md`), data, rewriteAssetPaths(markdown.body, slug));
  }
}

async function ingestPosts({ docDir, context, repo, slug, include, exclude }) {
  const postsDir = path.join(docDir, "posts");
  const files = await collectMarkdownFiles(postsDir).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  for (const file of files.filter((file) => included(file, docDir, include, exclude))) {
    const relative = path.relative(postsDir, file).replace(/\\/g, "/");
    const markdown = await readMarkdown(file);
    const errors = validateBlogPost(markdown.data, `${context} posts/${relative}`);
    if (errors.length > 0) throw new Error(errors.join("\n"));

    const stem = relative.replace(/\.md$/i, "").replace(/\//g, "-");
    const postSlug = markdown.data.slug ?? `${repo}-${stem}`;

    if (!validateOnly) {
      await writeMarkdown(
        path.join(BLOG_DIR, `${postSlug}.md`),
        omit(markdown.data, ["slug", "project"]),
        rewriteAssetPaths(markdown.body, slug),
      );
    }
  }
}

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(file)));
    } else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_")) {
      files.push(file);
    }
  }

  return files;
}

async function readMarkdown(file) {
  const raw = await readFile(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  return match
    ? { data: parseYaml(match[1]) ?? {}, body: match[2].trimStart() }
    : { data: {}, body: raw.trimStart() };
}

async function writeMarkdown(file, data, body) {
  await writeFile(file, `---\n${stringifyYaml(data, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.trimStart()}`, "utf8");
}

async function readYaml(file) {
  return parseYaml(await readFile(file, "utf8")) ?? {};
}

async function readOptionalYaml(file) {
  try {
    return await readYaml(file);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function validateBlogPost(data, context) {
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

function validateSharedFields(data, context) {
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

function included(file, base, include, exclude) {
  const relative = path.relative(base, file).replace(/\\/g, "/");
  return matchGlob(relative, include) && !exclude.some((pattern) => matchGlob(relative, pattern));
}

function matchGlob(relative, pattern) {
  let regex = "";

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const next = pattern[i + 1];

    if (char === "*" && next === "*") {
      regex += pattern[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += pattern[i + 2] === "/" ? 2 : 1;
    } else if (char === "*") {
      regex += "[^/]*";
    } else if (char === "?") {
      regex += ".";
    } else {
      regex += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }

  return new RegExp(`^${regex}$`).test(relative);
}

async function copyAssets(docDir, slug) {
  const assets = path.join(docDir, "assets");
  if (!(await exists(assets))) return;

  const target = path.join(PUBLIC_ASSETS_DIR, slug);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(assets, target, { recursive: true });
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function assertDirectory(dir, label) {
  const info = await stat(dir).catch((error) => {
    if (error.code === "ENOENT") throw new Error(`${label} directory not found`);
    throw error;
  });

  if (!info.isDirectory()) {
    throw new Error(`${label} exists but is not a directory`);
  }
}

function rewriteAssetPaths(body, slug) {
  return body.replace(/(\]\()(\.\/)?assets\//g, `$1/content-sources/${slug}/`);
}

function omit(data, keys) {
  const next = { ...data };
  for (const key of keys) delete next[key];
  return next;
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
