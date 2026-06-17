import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import degit from "degit";
import { parse as parseYaml } from "yaml";
import {
  collectMarkdownFiles,
  inferTitle,
  normalizeDocTitle,
  normalizeImportedBody,
  normalizePageOrder,
  omit,
  readMarkdown,
  stripLeadingH1,
  validateBlogPost,
  validateSharedFields,
  writeMarkdown,
} from "./content.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CACHE_DIR = path.join(ROOT, ".cache/content-sources");
const SOURCE_DIR = path.join(CACHE_DIR, "sources");
const PROJECTS_DIR = path.join(CACHE_DIR, "projects");
const PROJECT_DOCS_DIR = path.join(CACHE_DIR, "project-docs");
const BLOG_DIR = path.join(CACHE_DIR, "blog");
const PUBLIC_ASSETS_DIR = path.join(ROOT, "public/content-sources");
const MANIFEST_PATH = path.join(ROOT, "content-sources.yaml");
const DEFAULT_DOC_EXCLUDES = ["project.md", "posts/**", "assets/**", "nthings.meta.yaml"];

export async function runContentSourceSync({ validateOnly = false } = {}) {
  const manifest = await readYaml(MANIFEST_PATH);

  if (!Array.isArray(manifest.sources)) {
    throw new Error("content-sources.yaml must define a sources array");
  }

  if (!validateOnly) {
    await resetOutput();
  }

  const lock = await syncSources(manifest, { validateOnly });

  if (validateOnly) {
    console.log("All configured sources are valid.");
    return;
  }

  await writeLockFile(lock);
  console.log(`Synced ${lock.sources.length} source(s) to ${path.relative(ROOT, CACHE_DIR)}`);
}

async function syncSources(manifest, { validateOnly = false } = {}) {
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
    const exclude = meta.exclude ?? [];
    const pageOrder = normalizePageOrder(meta.pageOrder, `${context} nthings.meta.yaml`);

    if (slugs.has(slug)) {
      throw new Error(`Duplicate slug "${slug}" from ${context}`);
    }
    slugs.add(slug);

    if (meta.include?.project ?? true) {
      await ingestProject({
        docDir,
        context,
        source,
        slug,
        order: meta.order ?? source.order,
        validateOnly,
      });
      await ingestProjectDocs({ docDir, context, slug, exclude, pageOrder, validateOnly });
    }

    await ingestPosts({
      docDir,
      context,
      repo: source.repo,
      slug,
      include: meta.include?.posts ?? "posts/**/*.md",
      exclude,
      validateOnly,
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

async function ingestProject({ docDir, context, source, slug, order, validateOnly }) {
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
    await writeMarkdown(path.join(PROJECTS_DIR, `${slug}.md`), data, normalizeImportedBody(markdown.body, slug));
  }
}

async function ingestProjectDocs({ docDir, context, slug, exclude, pageOrder, validateOnly }) {
  const files = (await collectMarkdownFiles(docDir))
    .map((file) => ({
      file,
      relative: path.relative(docDir, file).replace(/\\/g, "/"),
    }))
    .filter(({ relative }) => !matchesAny(relative, [...DEFAULT_DOC_EXCLUDES, ...exclude]))
    .toSorted((a, b) => a.relative.localeCompare(b.relative));
  const pageSlugs = new Set();
  const orderByPageSlug = new Map(pageOrder.map((pageSlug, index) => [pageSlug, index * 10]));

  for (const pageSlug of pageOrder) {
    if (!files.some(({ relative }) => relative.replace(/\.md$/i, "") === pageSlug)) {
      throw new Error(`${context}: nthings.meta.yaml pageOrder references missing page "${pageSlug}"`);
    }
  }

  for (const [index, { file, relative }] of files.entries()) {
    const pageSlug = relative.replace(/\.md$/i, "");
    if (pageSlugs.has(pageSlug)) {
      throw new Error(`${context}: duplicate project doc slug "${pageSlug}"`);
    }
    pageSlugs.add(pageSlug);

    const markdown = await readMarkdown(file);
    const sourceTitle = markdown.data.title ?? inferTitle(markdown.body);
    if (!sourceTitle) {
      throw new Error(`${context}: ${relative}: could not infer title`);
    }
    const title = normalizeDocTitle(sourceTitle, slug);

    if (markdown.data.order !== undefined && typeof markdown.data.order !== "number") {
      throw new Error(`${context}: ${relative}: "order" must be a number`);
    }

    const data = omit(
      {
        project: slug,
        title,
        description: markdown.data.description ?? "",
        navTitle: markdown.data.navTitle,
        order: markdown.data.order ?? orderByPageSlug.get(pageSlug) ?? (pageOrder.length + index) * 10,
        sourcePath: relative,
      },
      ["slug"],
    );

    if (!validateOnly) {
      const outFile = path.join(PROJECT_DOCS_DIR, slug, `${pageSlug}.md`);
      await writeMarkdown(outFile, data, normalizeImportedBody(stripLeadingH1(markdown.body), slug));
    }
  }
}

async function ingestPosts({ docDir, context, repo, slug, include, exclude, validateOnly }) {
  const postsDir = path.join(docDir, "posts");
  const files = await collectMarkdownFiles(postsDir);

  for (const file of files.filter((file) => {
    const relative = path.relative(docDir, file).replace(/\\/g, "/");
    return path.matchesGlob(relative, include) && !matchesAny(relative, exclude);
  })) {
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
        normalizeImportedBody(markdown.body, slug),
      );
    }
  }
}

async function resetOutput() {
  await rm(CACHE_DIR, { recursive: true, force: true });
  await rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true });
  await mkdir(SOURCE_DIR, { recursive: true });
  await mkdir(PROJECTS_DIR, { recursive: true });
  await mkdir(PROJECT_DOCS_DIR, { recursive: true });
  await mkdir(BLOG_DIR, { recursive: true });
}

async function copyAssets(docDir, slug) {
  const assets = path.join(docDir, "assets");
  if (!(await exists(assets))) return;

  const target = path.join(PUBLIC_ASSETS_DIR, slug);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(assets, target, { recursive: true });
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

async function writeLockFile(lock) {
  await writeFile(path.join(CACHE_DIR, "lock.json"), `${JSON.stringify(lock, null, 2)}\n`, "utf8");
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

function matchesAny(relative, patterns) {
  return patterns.some((pattern) => path.matchesGlob(relative, pattern));
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}
