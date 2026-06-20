import { initOnce } from "@/scripts/init-once";

// Lift the sticky header (shadow + solidified bg) once the page scrolls.
initOnce("header-scroll", () => {
  let ticking = false;
  const apply = () => {
    ticking = false;
    document.documentElement.toggleAttribute(
      "data-scrolled",
      window.scrollY > 4,
    );
  };
  const onScroll = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("astro:page-load", apply);
  document.addEventListener("astro:after-swap", apply);
  apply();
});
