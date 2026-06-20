import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import MarkdownItGitHubAlerts from "markdown-it-github-alerts";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(MarkdownItGitHubAlerts);

const PURIFY_CONFIG = {
  ADD_TAGS: ["svg", "path"],
  ADD_ATTR: [
    "viewBox",
    "version",
    "aria-hidden",
    "d",
    "fill",
    "width",
    "height",
    "class",
    "rel",
    "colspan",
    "rowspan",
  ],
};

export function renderMarkdownPreview(markdown: string): string {
  return DOMPurify.sanitize(md.render(markdown), PURIFY_CONFIG);
}
