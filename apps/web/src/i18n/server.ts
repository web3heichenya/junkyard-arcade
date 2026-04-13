import { defaultLocale, isLocale, type Locale } from '@/i18n/i18n';

import en from '@/i18n/messages/en.json';
import zh from '@/i18n/messages/zh.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function getLocaleAndMessages(localeParam?: string): {
  locale: Locale;
  messages: Record<string, unknown>;
} {
  const locale: Locale = localeParam && isLocale(localeParam) ? localeParam : defaultLocale;
  const messages: Record<string, unknown> =
    locale === 'zh'
      ? (zh as unknown as Record<string, unknown>)
      : (en as unknown as Record<string, unknown>);
  return { locale, messages };
}

export function pickLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  return acceptLanguage.toLowerCase().includes('zh') ? 'zh' : defaultLocale;
}

export function t(messages: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let cur: unknown = messages;
  for (const p of parts) {
    if (isRecord(cur) && p in cur) {
      cur = cur[p];
    } else {
      return key;
    }
  }
  return typeof cur === 'string' ? cur : key;
}
