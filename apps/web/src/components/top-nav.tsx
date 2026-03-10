'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Globe, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/providers/i18n-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { WalletButton } from '@/components/wallet-button';

function swapLocale(pathname: string, nextLocale: string) {
  const parts = pathname.split('/');
  // ["", "en", ...]
  if (parts.length >= 2) {
    parts[1] = nextLocale;
    return parts.join('/');
  }
  return `/${nextLocale}`;
}

export default function TopNav() {
  const pathname = usePathname() || '/';
  const { locale, t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="h-10 w-auto" />
        </Link>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <nav className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm" className="h-10">
              <Link href={`/${locale}/series`}>{t('nav.series')}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-10">
              <Link href={`/${locale}/create`}>{t('nav.create')}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-10">
              <Link href={`/${locale}/docs`}>{t('nav.docs')}</Link>
            </Button>
          </nav>

          <div className="h-6 w-px bg-border mx-1 hidden md:block" />

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="jy-action-btn md:hidden"
                  aria-label={t('nav.menu')}
                >
                  <Menu />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/series`}>{t('nav.series')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/create`}>{t('nav.create')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/docs`}>{t('nav.docs')}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="jy-action-btn"
                  aria-label={t('common.language')}
                >
                  <Globe />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={swapLocale(pathname, 'en')}>{t('common.english')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={swapLocale(pathname, 'zh')}>{t('common.chinese')}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}
