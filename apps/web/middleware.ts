import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'zh'] as const;
const defaultLocale = 'en';

function pickLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return defaultLocale;
  const lower = acceptLanguage.toLowerCase();
  if (lower.includes('zh')) return 'zh';
  return 'en';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore Next internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_not-found') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const hasLocalePrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocalePrefix) return NextResponse.next();

  const locale = pickLocale(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api).*)'],
};
