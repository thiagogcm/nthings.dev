/** A single searchable entry in the prebuilt /search.json index. */
export interface SearchDoc {
  title: string;
  url: string;
  section: string;
  description: string;
  tags: string[];
  text: string;
}

/**
 * A SearchDoc with case-folded fields + snippet haystack precomputed once, so
 * each keystroke only runs cheap `includes` against ready strings.
 */
export interface IndexedDoc extends SearchDoc {
  lcTitle: string;
  lcDesc: string;
  lcTags: string;
  lcText: string;
  hay: string;
  lcHay: string;
}

/** Max characters of body text stored per entry in the search index. */
export const SEARCH_TEXT_MAX = 1500;

const SNIPPET_FALLBACK_LEN = 140;
const SNIPPET_LEAD = 50;
const SNIPPET_SPAN = 110;

/** Reduce Markdown to plain prose for indexing (drops code, links → labels, markers). */
export function stripMarkdown(md: string): string {
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

/** Precompute the case-folded fields a query matches against. */
export function indexDoc(doc: SearchDoc): IndexedDoc {
  const hay = `${doc.description} ${doc.text}`.trim();
  return {
    ...doc,
    lcTitle: doc.title.toLowerCase(),
    lcDesc: doc.description.toLowerCase(),
    lcTags: doc.tags.join(" ").toLowerCase(),
    lcText: doc.text.toLowerCase(),
    hay,
    lcHay: hay.toLowerCase(),
  };
}

/** Weighted relevance score; every term must match somewhere (AND), else 0. */
export function scoreDoc(doc: IndexedDoc, terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    let termScore = 0;
    if (doc.lcTitle.includes(term)) {
      termScore += doc.lcTitle.startsWith(term) ? 16 : 10;
    }
    if (doc.lcTags.includes(term)) {
      termScore += 8;
    }
    if (doc.lcDesc.includes(term)) {
      termScore += 4;
    }
    if (doc.lcText.includes(term)) {
      termScore += 1;
    }
    if (termScore === 0) {
      return 0;
    }
    total += termScore;
  }
  return total;
}

/** A context window around the earliest matching term, with ellipses. */
export function buildSnippet(doc: IndexedDoc, terms: string[]): string {
  const { hay, lcHay } = doc;
  if (!hay) {
    return "";
  }
  let pos = -1;
  for (const term of terms) {
    const i = lcHay.indexOf(term);
    if (i !== -1 && (pos === -1 || i < pos)) {
      pos = i;
    }
  }
  if (pos === -1) {
    return hay.slice(0, SNIPPET_FALLBACK_LEN);
  }
  const start = Math.max(0, pos - SNIPPET_LEAD);
  const end = Math.min(hay.length, pos + SNIPPET_SPAN);
  return (
    (start > 0 ? "…" : "") +
    hay.slice(start, end) +
    (end < hay.length ? "…" : "")
  );
}
