import { initOnce } from "@/scripts/init-once";

initOnce("mobile-docs-nav", () => {
  // `toggle` doesn't bubble, so listen in the capture phase.
  let openPanel: HTMLDetailsElement | null = null;
  let openedAtY = 0;
  document.addEventListener(
    "toggle",
    (event) => {
      const details = event.target;
      if (
        details instanceof HTMLDetailsElement &&
        details.closest(".mobile-doc-nav")
      ) {
        openPanel = details.open ? details : null;
        openedAtY = window.scrollY;
      }
    },
    true,
  );

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!openPanel || !(target instanceof Element)) {
      return;
    }
    if (target.closest(".mobile-doc-nav a") || !openPanel.contains(target)) {
      openPanel.open = false;
    }
  });

  // The open panel is sticky and covers content; close it once the page
  // scrolls away beneath it.
  window.addEventListener(
    "scroll",
    () => {
      if (openPanel && Math.abs(window.scrollY - openedAtY) > 24) {
        openPanel.open = false;
      }
    },
    { passive: true },
  );
});
