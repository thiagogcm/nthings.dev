import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  collectMarkdownFiles,
  normalizeImportedBody,
  normalizePageOrder,
  stripLeadingH1,
  validateBlogPost,
  validateSharedFields,
} from "../content.mjs";

test("collectMarkdownFiles finds nested Markdown and skips drafts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "content-sync-"));
  try {
    await mkdir(path.join(root, "nested"), { recursive: true });
    await writeFile(path.join(root, "guide.md"), "# Guide\n");
    await writeFile(path.join(root, "_draft.md"), "# Draft\n");
    await writeFile(path.join(root, "nested", "page.md"), "# Page\n");

    const files = await collectMarkdownFiles(root);
    assert.deepEqual(files.map((file) => path.relative(root, file)).sort(), [
      "guide.md",
      "nested/page.md",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validation covers shared fields, blog dates, and page order", () => {
  assert.deepEqual(validateSharedFields({}, "ctx"), [
    'ctx: frontmatter requires "title"',
    'ctx: frontmatter requires "description"',
  ]);
  assert.deepEqual(
    validateBlogPost({ title: "Post", description: "Desc", pubDate: "not-a-date" }, "ctx"),
    ['ctx: "pubDate" must be a valid date'],
  );
  assert.deepEqual(normalizePageOrder(["./architecture.md", "guide"], "ctx"), [
    "architecture",
    "guide",
  ]);
  assert.throws(
    () => normalizePageOrder(["guide", "guide.md"], "ctx"),
    /duplicate pageOrder entry "guide"/,
  );
});

test("body normalization strips imported chrome and rewrites local links", () => {
  const body = stripLeadingH1(`# Demo

## Table of Contents

- [Guide](guide.md)

## Details

See [logo](./assets/icon.svg), [project](./project.md), and [guide](guide.md#setup).
`);

  assert.equal(
    normalizeImportedBody(body, "demo"),
    `## Details

See [logo](/content-sources/demo/icon.svg), [project](/projects/demo), and [guide](/projects/demo/guide#setup).
`,
  );
});
