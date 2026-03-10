'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/providers/i18n-provider';
import { Ticker } from './ticker';

export default function Hero() {
  const { locale, t } = useI18n();

  // Glitch animation variants for the title
  const glitchVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35 },
    },
    hover: {
      x: [0, -2, 2, -1, 1, 0],
      y: [0, 1, -1, 2, -2, 0],
      textShadow: [
        '2px 2px 0px rgba(0,255,0,0.8), -2px -2px 0px rgba(255,0,0,0.8)',
        '-2px -2px 0px rgba(0,255,0,0.8), 2px 2px 0px rgba(255,0,0,0.8)',
        '0px 0px 0px rgba(0,0,0,0)',
      ],
      transition: { duration: 0.2, repeat: Infinity, repeatType: 'mirror' as const },
    },
  };

  return (
    <Card className="relative overflow-hidden border-x-0 border-foreground bg-foreground text-background w-screen ml-[calc(50%-50vw)] rounded-none">
      {/* Ticker at the top of the hero */}
      <div className="absolute top-0 w-full z-20 border-b-2 border-foreground/30">
        <Ticker text="◆ APE INTO THE PROTOCOL ◆ WAGMI ◆ VERIFIABLE RNG ◆ DEGEN NATIVE ◆ SOULBOUND LOOT ◆ NO RUGS ◆ JUST CODE ◆ BURN THE BOX ◆ " />
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-80 mt-8">
        <div className="h-full w-full bg-[radial-gradient(700px_320px_at_15%_20%,hsl(140_78%_45%/0.25),transparent_60%),radial-gradient(520px_260px_at_85%_25%,hsl(40_95%_55%/0.2),transparent_55%)]" />
        {/* CSS scanlines class applied globally usually, but let's add an explicit glitch line overlay */}
        <div className="absolute inset-0 bg-[url('/sprites/scanlines.png')] mix-blend-overlay opacity-30" />
      </div>

      <CardContent className="relative z-10 mx-auto w-full max-w-6xl grid gap-8 p-6 sm:p-10 pt-24 pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center mt-6 min-h-[625px]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-accent font-bold">
            <span className="bg-accent/20 px-2 py-1 border border-accent/40">
              {t('home.heroTag1')}
            </span>
            <span className="bg-accent/20 px-2 py-1 border border-accent/40">
              {t('home.heroTag2')}
            </span>
            <span className="bg-accent/20 px-2 py-1 border border-accent/40">
              {t('home.heroTag3')}
            </span>
          </div>

          <motion.h1
            className="jy-display text-4xl leading-tight sm:text-5xl lg:text-6xl uppercase tracking-wider text-white"
            variants={glitchVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
          >
            {t('home.title')}
          </motion.h1>

          <motion.p
            className="max-w-2xl text-lg text-background/90 sm:text-2xl font-(--font-body) tracking-wide dark:text-background"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            {t('home.subtitle')}
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4 pt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16 }}
          >
            <Button
              asChild
              className="h-14 px-8 text-lg bg-accent text-accent-foreground hover:bg-(--color-button-hot) border-2 border-background shadow-[6px_6px_0_0_var(--color-shadow)] transition-all active:translate-y-1 active:shadow-[2px_2px_0_0_var(--color-shadow)]"
            >
              <Link href={`/${locale}/series`}>
                <Sparkles className="mr-2 h-5 w-5" />
                {t('home.ctaPrimary')}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-14 px-6 border-background/50 bg-background/95 text-foreground hover:bg-secondary dark:border-background/35 dark:bg-background/92 dark:text-foreground"
            >
              <Link href={`/${locale}/create`}>
                <Plus className="mr-2 h-5 w-5" />
                {t('nav.create')}
              </Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          className="grid gap-4"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="overflow-hidden border-4 border-background/30 bg-background/5 text-white shadow-2xl relative">
            {/* Mock Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[url('/sprites/scanlines.png')] mix-blend-overlay opacity-20 z-20"></div>

            <CardContent className="grid gap-4 p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-accent/80">
                <span>{t('home.heroPreviewLabel')}</span>
                <span className="animate-pulse flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent"></span>
                  {t('home.heroPreviewStatus')}
                </span>
              </div>
              <div className="grid place-items-center border-2 border-dashed border-accent/30 bg-black/35 p-8 shadow-inner relative group cursor-pointer overflow-hidden dark:bg-black/25">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: [0, -2, 2, -1, 1, 0] }}
                  transition={{ duration: 0.2 }}
                >
                  <Image
                    src="/logo.png"
                    alt={t('home.title')}
                    width={220}
                    height={220}
                    className="pixelated h-auto w-48 filter drop-shadow-[0_0_15px_rgba(0,255,0,0.5)]"
                  />
                </motion.div>
                <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none translate-y-full group-hover:-translate-y-full transition-transform duration-[2s] ease-linear bg-linear-to-b from-transparent via-accent/20 to-transparent"></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: (
                      <Image
                        src="/sprites/dust.svg"
                        alt={t('hero.dust')}
                        width={20}
                        height={20}
                        className="pixelated brightness-200"
                      />
                    ),
                    label: t('hero.dust'),
                  },
                  {
                    icon: (
                      <Image
                        src="/sprites/box.svg"
                        alt={t('hero.box')}
                        width={20}
                        height={20}
                        className="pixelated brightness-200"
                      />
                    ),
                    label: t('hero.box'),
                  },
                  {
                    icon: (
                      <Image
                        src="/sprites/rng.svg"
                        alt={t('hero.rng')}
                        width={20}
                        height={20}
                        className="pixelated brightness-200"
                      />
                    ),
                    label: t('hero.rng'),
                  },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="border-2 border-background/20 bg-black/30 p-3 text-center transition-colors hover:border-accent/50 hover:bg-black/50 dark:border-background/15 dark:bg-black/20"
                  >
                    <div className="mx-auto mb-2 grid h-10 w-10 place-items-center border border-accent/40 bg-accent/10 text-accent">
                      {x.icon}
                    </div>
                    <div className="text-xs font-bold tracking-wider text-background/90 dark:text-background">
                      {x.label}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </CardContent>
    </Card>
  );
}
