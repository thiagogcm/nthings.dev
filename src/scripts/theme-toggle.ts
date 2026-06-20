import { initOnce } from "@/scripts/init-once";

const order = ["system", "light", "dark"] as const;
const labels = {
  system: "Theme: system. Activate to use light theme",
  light: "Theme: light. Activate to use dark theme",
  dark: "Theme: dark. Activate to use system theme",
} as const;

const apply = (theme: string) => {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") {
    root.dataset.theme = theme;
  } else {
    delete root.dataset.theme;
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")
    .forEach((btn) => {
      const label =
        labels[(theme as keyof typeof labels) || "system"] ?? labels.system;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
};

const sync = () => {
  apply(document.documentElement.dataset.theme || "system");
};

initOnce("theme-toggle", () => {
  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-theme-toggle]");
    if (!btn) {
      return;
    }
    const cur = document.documentElement.dataset.theme || "system";
    const next =
      order[(order.indexOf(cur as (typeof order)[number]) + 1) % order.length];
    try {
      if (next === "system") {
        localStorage.removeItem("theme");
      } else {
        localStorage.setItem("theme", next);
      }
    } catch {
      // Ignore storage failures (private mode, blocked cookies).
    }
    apply(next);
  });
  document.addEventListener("astro:page-load", sync);
  document.addEventListener("astro:after-swap", sync);
  sync();
});
