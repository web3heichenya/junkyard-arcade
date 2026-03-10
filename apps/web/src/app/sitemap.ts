import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const now = new Date();
  const locales = ['en', 'zh'] as const;

  const staticPaths = ['', '/series', '/create', '/docs', '/me'];

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const p of staticPaths) {
      entries.push({
        url: `${base}/${locale}${p}`,
        lastModified: now,
        changeFrequency: p === '' ? 'hourly' : 'daily',
        priority: p === '' ? 1 : 0.7,
      });
    }
  }
  return entries;
}
