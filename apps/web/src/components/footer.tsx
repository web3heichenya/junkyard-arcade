'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { Ticker } from './ticker';
import { useI18n } from '@/providers/i18n-provider';

export default function Footer() {
  const { locale, t } = useI18n();
  const year = new Date().getFullYear();

  const communityLinks = [
    {
      label: t('footer.github'),
      href: 'https://github.com/web3heichenya/junkyard-arcade',
      external: true,
    },
  ];

  return (
    <footer className="mt-24 border-t-2 border-foreground relative">
      {/* Top ticker strip */}
      <div className="border-b-2 border-foreground/30">
        <Ticker text="◆ JUNKYARD ARCADE ◆ DEGEN PROTOCOL ◆ VERIFIABLE RNG ◆ ONCHAIN BLIND BOXES ◆ SOULBOUND LOOT ◆ NO RUGS ◆ JUST CODE ◆ " />
      </div>

      {/* Main footer content */}
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
          {/* Brand column */}
          <div className="space-y-6">
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt="Junkyard Arcade"
                width={40}
                height={40}
                className="h-10 w-auto pixelated group-hover:scale-110 transition-transform"
              />
              <span className="jy-display text-lg tracking-wider uppercase">{t('app.name')}</span>
            </Link>
            <p className="flex items-center gap-1.5 font-(--font-body) text-xs text-muted-foreground/75 dark:text-foreground/72">
              {t('footer.builtWith')} <Heart className="h-3 w-3 text-accent fill-accent" />
            </p>
          </div>

          {/* Community links */}
          <div className="space-y-4">
            <h3 className="jy-display text-xs uppercase tracking-[0.2em] text-accent">
              {t('footer.community')}
            </h3>
            <ul className="space-y-2.5">
              {communityLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-(--font-body) text-sm tracking-wide text-muted-foreground transition-colors hover:text-foreground dark:text-foreground/78 group"
                  >
                    <span className="text-accent/40 group-hover:text-accent transition-colors">
                      ▸
                    </span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t-2 border-foreground/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-(--font-body) text-xs tracking-wide text-muted-foreground/70 dark:text-foreground/68">
            © {year} Junkyard Arcade. {t('footer.rights')}
          </p>
          <div className="jy-display flex items-center gap-1.5 text-xs tracking-widest text-muted-foreground/55 dark:text-foreground/58">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse"></span>
            PROTOCOL LIVE
          </div>
        </div>
      </div>
    </footer>
  );
}
