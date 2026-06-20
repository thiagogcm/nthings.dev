export const SITE = {
  title: "nthings.dev",
  author: "Thiago Moura",
  description: "Experiments, thoughts, and anything in between",
  url: "https://nthings.dev",
  locale: "en-US",
  ogImage: "/nthings.svg",
  location: "0.0.0.0",
  role: "AI|Cloud-native engineer",
} as const;

export const NAV_LINKS = [
  {
    href: "/",
    label: "Home",
    icon: "lucide:home",
    description: "void main()",
  },
  {
    href: "/projects",
    label: "Projects",
    icon: "lucide:folder-kanban",
    description: "Side project labs worth sharing",
  },
  {
    href: "/blog",
    label: "Blog",
    icon: "lucide:notebook-tabs",
    description: "Snippets, stack traces, and a few diagrams",
  },
  {
    href: "/about",
    label: "About",
    icon: "lucide:badge-check",
    description: "Release notes",
  },
] as const;

export const SOCIAL_LINKS = [
  {
    href: "https://github.com/thiagogcm",
    label: "GitHub",
    icon: "lucide:github",
  },
  {
    href: "https://linkedin.com/in/thiago-moura-77a30030",
    label: "LinkedIn",
    icon: "lucide:linkedin",
  },
] as const;

export const CURRENT_FOCUS = [
  "Agentic AI",
  "Observability",
  "Cloud-native Applications",
] as const;
