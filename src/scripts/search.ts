import { escapeHtml } from "@/lib/html";
import {
  buildSnippet,
  type IndexedDoc,
  indexDoc,
  type SearchDoc,
  scoreDoc,
} from "@/lib/search";
import { initOnce } from "@/scripts/init-once";

const MAX_RESULTS = 12;

let indexPromise: Promise<IndexedDoc[]> | null = null;
let activeIndex = 0;
let current: string[] = [];

const loadIndex = (): Promise<IndexedDoc[]> => {
  indexPromise ??= fetch("/search.json")
    .then((r) => (r.ok ? (r.json() as Promise<SearchDoc[]>) : []))
    .then((docs) => docs.map(indexDoc))
    .catch(() => [] as IndexedDoc[]);
  return indexPromise;
};

const dialog = () =>
  document.getElementById("search-dialog") as HTMLDialogElement | null;
const input = () =>
  document.getElementById("search-input") as HTMLInputElement | null;
const list = () => document.getElementById("search-results");

// Prebuilt per-term regexes (built once per render) wrap matches in <mark>.
const highlight = (text: string, regexes: RegExp[]) => {
  let out = escapeHtml(text);
  for (const re of regexes) {
    out = out.replace(re, "<mark>$1</mark>");
  }
  return out;
};

const render = async (query: string) => {
  const ul = list();
  const empty = document.querySelector(
    "[data-search-empty]",
  ) as HTMLElement | null;
  const hint = document.querySelector(
    "[data-search-hint]",
  ) as HTMLElement | null;
  if (!ul) {
    return;
  }

  const q = query.trim().toLowerCase();
  if (!q) {
    ul.innerHTML = "";
    current = [];
    if (empty) {
      empty.hidden = true;
    }
    if (hint) {
      hint.hidden = false;
    }
    return;
  }
  if (hint) {
    hint.hidden = true;
  }

  const terms = q.split(/\s+/).filter(Boolean);
  const regexes = terms.map(
    (t) => new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );
  const docs = await loadIndex();
  const ranked = docs
    .map((doc) => ({ doc, s: scoreDoc(doc, terms) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_RESULTS);

  current = ranked.map((r) => r.doc.url);
  activeIndex = 0;

  if (ranked.length === 0) {
    ul.innerHTML = "";
    if (empty) {
      empty.hidden = false;
    }
    return;
  }
  if (empty) {
    empty.hidden = true;
  }

  ul.innerHTML = ranked
    .map(
      ({ doc }, i) => `
      <li role="option" id="search-result-${i}" aria-selected="${i === 0}"
          class="search-result${i === 0 ? " is-active" : ""}"
          data-search-result data-url="${escapeHtml(doc.url)}" data-index="${i}">
        <span class="search-result__section">${escapeHtml(doc.section)}</span>
        <span class="search-result__title">${highlight(doc.title, regexes)}</span>
        <span class="search-result__snippet">${highlight(buildSnippet(doc, terms), regexes)}</span>
      </li>`,
    )
    .join("");
};

const setActive = (next: number) => {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>("[data-search-result]"),
  );
  if (items.length === 0) {
    return;
  }
  activeIndex = (next + items.length) % items.length;
  items.forEach((el, i) => {
    const on = i === activeIndex;
    el.classList.toggle("is-active", on);
    el.setAttribute("aria-selected", String(on));
    if (on) {
      el.scrollIntoView({ block: "nearest" });
    }
  });
  const inp = input();
  if (inp) {
    inp.setAttribute("aria-activedescendant", `search-result-${activeIndex}`);
  }
};

const openDialog = () => {
  const d = dialog();
  if (!d) {
    return;
  }
  if (!d.open) {
    d.showModal();
  }
  const inp = input();
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  render("");
};

const closeDialog = () => {
  const d = dialog();
  if (d?.open) {
    d.close();
  }
};

const go = (url: string) => {
  closeDialog();
  window.location.href = url;
};

initOnce("search", () => {
  // Document-level delegation survives view-transition swaps.
  document.addEventListener("keydown", (e) => {
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const d = dialog();
      if (d?.open) {
        closeDialog();
      } else {
        openDialog();
      }
      return;
    }
    if (
      e.key === "/" &&
      !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName) &&
      !dialog()?.open
    ) {
      e.preventDefault();
      openDialog();
      return;
    }
    const d = dialog();
    if (!d?.open) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === "Enter") {
      const url = current[activeIndex];
      if (url) {
        e.preventDefault();
        go(url);
      }
    }
  });

  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-search-trigger]")) {
      e.preventDefault();
      openDialog();
      return;
    }
    if (t.closest("[data-search-close]")) {
      closeDialog();
      return;
    }
    const result = t.closest("[data-search-result]") as HTMLElement | null;
    if (result) {
      const url = result.getAttribute("data-url");
      if (url) {
        go(url);
      }
      return;
    }
    // Click on backdrop (the dialog element itself) closes.
    if (t.id === "search-dialog") {
      closeDialog();
    }
  });

  document.addEventListener("input", (e) => {
    const t = e.target as HTMLElement;
    if (t.id === "search-input") {
      render((t as HTMLInputElement).value);
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!dialog()?.open) {
      return;
    }
    const result = (e.target as HTMLElement).closest?.(
      "[data-search-result]",
    ) as HTMLElement | null;
    if (result) {
      const idx = Number(result.getAttribute("data-index"));
      if (!Number.isNaN(idx) && idx !== activeIndex) {
        setActive(idx);
      }
    }
  });

  // Warm the index on first idle so the first query is instant.
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => loadIndex());
  } else {
    window.setTimeout(() => loadIndex(), 1200);
  }
});
