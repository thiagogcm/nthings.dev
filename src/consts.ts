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
    href: '/blog',
    label: 'Journal',
    icon: 'lucide:notebook-tabs',
    description: 'Writing on product, software, and systems.',
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: 'lucide:folder-kanban',
    description: 'Selected builds, experiments, and case studies.',
  },
] as const;

export const SOCIAL_LINKS = [
  { href: 'https://github.com/thiagogcm', label: 'GitHub', icon: 'lucide:github' },
  { href: 'https://linkedin.com/in/thiagomoura', label: 'LinkedIn', icon: 'lucide:linkedin' },
  { href: '/rss.xml', label: 'RSS', icon: 'lucide:rss' },
] as const;

export const CURRENT_FOCUS = ['AI agents', 'Observability', 'Product systems'] as const;

export const PRINCIPLES = [
  {
    title: 'Interfaces that stay calm',
    description:
      'Product surfaces should remain clear when the underlying systems get complex, asynchronous, or operationally noisy.',
    icon: 'lucide:sparkles',
  },
  {
    title: 'AI features with real utility',
    description:
      'I prefer copilots, workflows, and internal tools that meaningfully improve decisions instead of decorating the product with novelty.',
    icon: 'lucide:bot',
  },
  {
    title: 'Systems that remain legible',
    description:
      'Architecture, observability, and delivery paths need to stay understandable so teams can move quickly without losing their footing.',
    icon: 'lucide:waypoints',
  },
] as const;
