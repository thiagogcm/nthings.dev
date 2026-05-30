export const SITE = {
  title: 'nthings.dev',
  author: 'Thiago Moura',
  description:
    'Portfolio, writing, and selected work from Thiago Moura, a software engineer building AI-native products and resilient product systems.',
  url: 'https://nthings.dev',
  locale: 'en-US',
  ogImage: '/og-cover.svg',
  location: 'Belo Horizonte, Brazil',
  role: 'AI-native product engineer',
  availability: 'Open to select collaborations',
} as const;

export const NAV_LINKS = [
  {
    href: '/projects',
    label: 'Projects',
    icon: 'lucide:folder-kanban',
    description: 'Engineering references for selected builds.',
  },
  {
    href: '/blog',
    label: 'Writing',
    icon: 'lucide:notebook-tabs',
    description: 'Deep dives, post-mortems, and innovation spotlights.',
  },
  {
    href: '/about',
    label: 'About',
    icon: 'lucide:badge-check',
    description: 'Professional philosophy and technical focus.',
  },
] as const;

export const SOCIAL_LINKS = [
  { href: 'https://github.com/thiagogcm', label: 'GitHub', icon: 'lucide:github' },
  { href: 'https://linkedin.com/in/thiagomoura', label: 'LinkedIn', icon: 'lucide:linkedin' },
  { href: '/rss.xml', label: 'RSS', icon: 'lucide:rss' },
] as const;

export const CURRENT_FOCUS = ['AI agents', 'Observability', 'Product systems'] as const;
