'use client';

import * as React from 'react';
import { ProgressProvider } from '@bprogress/next/app';
import { ThemeProvider } from 'next-themes';

import type { Locale } from '@/i18n/i18n';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/providers/i18n-provider';
import { Web3Provider } from '@/providers/web3-provider';

export function Providers({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ProgressProvider
        color="var(--accent)"
        height="3px"
        options={{ showSpinner: false }}
        shallowRouting
      >
        <I18nProvider locale={locale} messages={messages}>
          <Web3Provider>
            {children}
            <Toaster position="top-center" richColors />
          </Web3Provider>
        </I18nProvider>
      </ProgressProvider>
    </ThemeProvider>
  );
}
