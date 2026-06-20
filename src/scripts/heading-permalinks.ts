import { initOnce } from "@/scripts/init-once";

// Add a copy-to-clipboard permalink to every in-content heading.
const ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

let toastTimer: number | undefined;

const copyUrl = async (anchor: HTMLAnchorElement, url: string) => {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    return;
  }
  anchor.setAttribute("data-copied", "true");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => anchor.removeAttribute("data-copied"),
    1300,
  );
};

const enhance = () => {
  const heads = document.querySelectorAll<HTMLElement>(
    ".prose h2[id], .prose h3[id], .prose h4[id]",
  );
  heads.forEach((h) => {
    if (h.querySelector(".heading-anchor")) {
      return;
    }
    const label = (h.textContent || "").trim();
    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = `#${h.id}`;
    anchor.title = "Copy link to this section";
    anchor.setAttribute("aria-label", `Copy link to “${label}”`);
    anchor.innerHTML = ICON;
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      // Update the address bar without scrolling, then copy the full URL.
      const url = `${location.pathname}${location.search}#${h.id}`;
      history.replaceState(history.state, "", url);
      copyUrl(anchor, location.origin + url);
    });
    h.appendChild(anchor);
  });
};

initOnce("heading-permalinks", () => {
  document.addEventListener("astro:page-load", enhance);
  enhance();
});
