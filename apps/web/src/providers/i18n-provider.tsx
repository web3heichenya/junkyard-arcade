'use client';

import * as React from 'react';

import type { Locale } from '@/i18n/i18n';

type Messages = Record<string, unknown>;

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: string) => string;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getByPath(messages: Messages, path: string): unknown {
  let current: unknown = messages;
  for (const part of path.split('.')) {
    if (isRecord(current) && part in current) {
      current = current[part];
      continue;
    }
    return undefined;
  }
  return current;
}

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const t = React.useCallback(
    (key: string) => {
      const v = getByPath(messages, key);
      return typeof v === 'string' ? v : key;
    },
    [messages]
  );

  return <I18nContext.Provider value={{ locale, messages, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within <I18nProvider>');
  }
  return ctx;
}
