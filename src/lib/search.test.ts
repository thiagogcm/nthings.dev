import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSnippet, indexDoc, scoreDoc, stripMarkdown } from "./search.ts";

test("stripMarkdown drops code/images, keeps link labels and prose", () => {
  const out = stripMarkdown(
    "# Title\n\n```js\ncode()\n```\n\nSome `inline` and a [link](https://x) and ![img](y).\n\n- item one\n- item two\n\n> quote",
  );

  assert.ok(!out.includes("`"), "inline/fenced code markers removed");
  assert.ok(!out.includes("code()"), "fenced code body removed");
  assert.ok(out.includes("link"), "link label kept");
  assert.ok(!out.includes("https://x"), "link url removed");
  assert.ok(!out.includes("img"), "image removed");
  assert.ok(out.includes("Title"), "heading text kept");
  assert.ok(out.includes("item one") && out.includes("item two"), "list kept");
  assert.ok(!/\s{2,}/.test(out), "whitespace collapsed");
  assert.equal(out, out.trim(), "trimmed");
});

const doc = indexDoc({
  title: "Helm Charts",
  url: "/projects/helm4j",
  section: "Projects",
  description: "A Helm SDK for Java",
  tags: ["helm", "java"],
  text: "deploy kubernetes manifests with helm",
});

test("scoreDoc weights title prefix highest and sums field hits", () => {
  // title-prefix(16) + tags(8) + desc(4) + text(1)
  assert.equal(scoreDoc(doc, ["helm"]), 29);
  // title non-prefix substring only
  assert.equal(scoreDoc(doc, ["charts"]), 10);
  // tags(8) + desc(4)
  assert.equal(scoreDoc(doc, ["java"]), 12);
});

test("scoreDoc is AND across terms — any unmatched term zeroes the score", () => {
  assert.equal(scoreDoc(doc, ["zzz"]), 0);
  assert.equal(scoreDoc(doc, ["helm", "zzz"]), 0);
});

test("buildSnippet windows the earliest match and falls back otherwise", () => {
  const hit = buildSnippet(doc, ["kubernetes"]);
  assert.ok(hit.includes("kubernetes"), "snippet contains the match");

  // No term in the haystack → leading slice of the full text.
  assert.equal(buildSnippet(doc, ["zzz"]), doc.hay);

  // Empty haystack → empty snippet.
  const blank = indexDoc({
    title: "x",
    url: "/x",
    section: "Pages",
    description: "",
    tags: [],
    text: "",
  });
  assert.equal(buildSnippet(blank, ["anything"]), "");
});
