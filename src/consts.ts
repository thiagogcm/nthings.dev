export const SITE = {
  title: 'nthings.dev',
  author: 'Thiago Moura',
  description:
    'Portfolio, writing, and selected work from Thiago Moura, a software engineer focused on AI-native products.',
  url: 'https://nthings.dev',
  locale: 'en-US',
  ogImage: '/og-cover.svg',
} as const;

export const NAV_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/projects', label: 'Projects' },
] as const;

export const SOCIAL_LINKS = [
  { href: 'https://github.com/thiagogcm', label: 'GitHub' },
  { href: 'https://linkedin.com/in/thiagomoura', label: 'LinkedIn' },
  { href: '/rss.xml', label: 'RSS' },
] as const;
