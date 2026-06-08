export const SITE = {
  title: 'nthings.dev',
  author: 'Thiago Moura',
  description:
    'Experiments, thoughts, and anything in between',
  url: 'https://nthings.dev',
  locale: 'en-US',
  ogImage: '/nthings.svg',
  location: '0.0.0.0',
  role: 'AI|Cloud-native engineer',
} as const;

export const NAV_LINKS = [
  {
    href: '/',
    label: 'Home',
    icon: 'lucide:home',
    description: 'Public journal',
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: 'lucide:folder-kanban',
    description: 'Side project labs worth sharing',
  },
  {
    href: '/blog',
    label: 'Blog',
    icon: 'lucide:notebook-tabs',
    description: 'Logs, stack traces, and few diagrams',
  },
  {
    href: '/about',
    label: 'About',
    icon: 'lucide:badge-check',
    description: 'Release notes',
  },
] as const;

export const SOCIAL_LINKS = [
  { href: 'https://github.com/thiagogcm', label: 'GitHub', icon: 'lucide:github' },
  { href: 'https://linkedin.com/in/thiago-moura-77a30030', label: 'LinkedIn', icon: 'lucide:linkedin' },
  { href: '/rss.xml', label: 'RSS', icon: 'lucide:rss' },
] as const;

export const CURRENT_FOCUS = ['AI agents', 'Observability', 'Product systems'] as const;
