'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import Footer from '@/components/footer';
import TopNav from '@/components/top-nav';

function isDocsPath(pathname: string | null, locale: string) {
  if (!pathname) return false;

  return pathname === `/${locale}/docs` || pathname.startsWith(`/${locale}/docs/`);
}

export function LocaleFrame({ locale, children }: { locale: string; children: React.ReactNode }) {
  const pathname = usePathname();

  if (isDocsPath(pathname, locale)) {
    return (
      <div className="min-h-dvh flex flex-col">
        <TopNav />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
