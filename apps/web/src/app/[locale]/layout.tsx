import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/i18n/i18n';
import { getLocaleAndMessages, t } from '@/i18n/server';
import { Providers } from '@/providers/providers';
import { LocaleFrame } from '@/components/locale-frame';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const p = await params;
  const { locale, messages } = getLocaleAndMessages(p.locale);
  const pathLocale = locale === 'zh' ? 'zh' : 'en';
  const title = `${t(messages, 'app.name')} | ${t(messages, 'app.tagline')}`;

  return {
    title,
    description: t(messages, 'home.subtitle'),
    alternates: {
      languages: {
        en: `/en`,
        zh: `/zh`,
      },
      canonical: `/${pathLocale}`,
    },
    openGraph: {
      title,
      description: t(messages, 'home.subtitle'),
      url: `/${pathLocale}`,
      siteName: t(messages, 'app.name'),
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const p = await params;
  if (!isLocale(p.locale)) notFound();
  const locale = p.locale as Locale;
  const { messages } = getLocaleAndMessages(locale);

  return (
    <Providers locale={locale} messages={messages}>
      <LocaleFrame locale={locale}>{children}</LocaleFrame>
    </Providers>
  );
}
