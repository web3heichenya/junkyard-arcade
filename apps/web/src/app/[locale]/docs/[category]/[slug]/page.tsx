import { redirect } from 'next/navigation';

import { isLocale, type Locale } from '@/i18n/i18n';

export default async function LegacyDocsArticlePage({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}) {
  const p = await params;
  const locale: Locale = isLocale(p.locale) ? p.locale : 'en';

  redirect(`/${locale}/docs#${p.slug}`);
}
