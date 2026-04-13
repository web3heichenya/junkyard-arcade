import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { Activity, Boxes, RadioTower, Sparkles } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { SeriesList, SeriesListSkeleton } from '@/components/series/series-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { isLocale, type Locale } from '@/i18n/i18n';
import { getLocaleAndMessages, t } from '@/i18n/server';
import {
  formatCompact,
  getSeriesCollection,
  getSeriesState,
  sumBy,
  type SeriesItem,
} from '@/lib/series';

function getFeaturedSeries(items: SeriesItem[]) {
  return items.find((item) => getSeriesState(item) === 'live') ?? items[0] ?? null;
}

function getSeriesDisplayName(item: SeriesItem, messages: Record<string, unknown>) {
  return item.nftName?.trim().length
    ? item.nftName
    : `${t(messages, 'series.detailTitle')} #${item.id}`;
}

function HeroStats({
  liveCount,
  totalPurchased,
  totalClaimed,
  messages,
}: {
  liveCount: number | string;
  totalPurchased: string;
  totalClaimed: string;
  messages: Record<string, unknown>;
}) {
  return (
    <>
      <span className="border border-background/30 bg-background/10 px-3 py-1 text-accent">
        {t(messages, 'series.state.live')}: {liveCount}
      </span>
      <span className="border border-background/30 bg-background/10 px-3 py-1 text-background/88">
        {t(messages, 'series.sold')}: {totalPurchased}
      </span>
      <span className="border border-background/30 bg-background/10 px-3 py-1 text-background/88">
        {t(messages, 'series.claimed')}: {totalClaimed}
      </span>
    </>
  );
}

async function HeroStatsContent({ messages }: { messages: Record<string, unknown> }) {
  const { items, error } = await getSeriesCollection();
  if (error) {
    return <HeroStats liveCount="--" totalPurchased="--" totalClaimed="--" messages={messages} />;
  }

  return (
    <HeroStats
      liveCount={items.filter((item) => getSeriesState(item) === 'live').length}
      totalPurchased={formatCompact(sumBy(items, 'totalPurchased'))}
      totalClaimed={formatCompact(sumBy(items, 'totalClaimed'))}
      messages={messages}
    />
  );
}

function HeroStatsFallback({ messages }: { messages: Record<string, unknown> }) {
  return (
    <>
      <span className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1 text-accent">
        {t(messages, 'series.state.live')}: <Skeleton className="h-4 w-6 bg-background/20" />
      </span>
      <span className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1 text-background/88">
        {t(messages, 'series.sold')}: <Skeleton className="h-4 w-10 bg-background/20" />
      </span>
      <span className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1 text-background/88">
        {t(messages, 'series.claimed')}: <Skeleton className="h-4 w-10 bg-background/20" />
      </span>
    </>
  );
}

async function FeaturedSeriesPanel({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Record<string, unknown>;
}) {
  const { items } = await getSeriesCollection();
  const featured = getFeaturedSeries(items);

  if (!featured) {
    return (
      <EmptyState
        title={t(messages, 'series.emptyTitle')}
        description={t(messages, 'series.emptyDesc')}
        className="px-0 py-6"
        iconClassName="border-background/20 bg-black/20"
        titleClassName="text-background"
        descriptionClassName="max-w-sm text-background/72"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="jy-display text-xl uppercase text-background">
          {getSeriesDisplayName(featured, messages)}
        </p>
        <p className="text-sm leading-6 text-background/72">
          {featured.nftSymbol ? `${featured.nftSymbol} · ` : ''}
          {t(messages, `series.state.${getSeriesState(featured)}`)} ·{' '}
          {t(messages, 'series.activeAssetsShort')}: {featured.activeAssetTypeCount}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-background/20 bg-black/20 p-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
            {t(messages, 'series.sold')}
          </div>
          <div className="mt-2 jy-display text-lg text-background">
            {featured.totalPurchased}/{featured.maxSupply}
          </div>
        </div>
        <div className="border border-background/20 bg-black/20 p-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
            {t(messages, 'series.claimed')}
          </div>
          <div className="mt-2 jy-display text-lg text-background">{featured.totalClaimed}</div>
        </div>
      </div>
      <Button
        asChild
        className="w-full bg-accent text-accent-foreground hover:bg-[color:var(--color-button-hot)]"
      >
        <Link href={`/${locale}/series/${featured.id}`}>{t(messages, 'series.inspectCta')}</Link>
      </Button>
    </div>
  );
}

function FeaturedSeriesFallback() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-background/20" />
        <Skeleton className="h-4 w-56 bg-background/20" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 border border-background/20 bg-black/20 p-3">
          <Skeleton className="h-4 w-16 bg-background/20" />
          <Skeleton className="h-7 w-20 bg-background/20" />
        </div>
        <div className="space-y-2 border border-background/20 bg-black/20 p-3">
          <Skeleton className="h-4 w-20 bg-background/20" />
          <Skeleton className="h-7 w-16 bg-background/20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full bg-background/20" />
    </div>
  );
}

function PulseCards({
  items,
}: {
  items: Array<{
    icon: ReactNode;
    label: string;
    value: string;
    desc: string;
  }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
        >
          <CardContent className="p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center border-2 border-foreground bg-accent/15 text-foreground">
              {item.icon}
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </p>
            <p className="jy-display mt-3 text-3xl uppercase text-foreground">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function PulseCardsContent({ messages }: { messages: Record<string, unknown> }) {
  const { items, error } = await getSeriesCollection();
  const liveCount = error
    ? '--'
    : `${items.filter((item) => getSeriesState(item) === 'live').length}`;
  const refillCount = error
    ? '--'
    : `${items.filter((item) => getSeriesState(item) === 'awaitingRefill').length}`;
  const totalPurchased = error ? '--' : formatCompact(sumBy(items, 'totalPurchased'));
  const totalClaimed = error ? '--' : formatCompact(sumBy(items, 'totalClaimed'));

  return (
    <PulseCards
      items={[
        {
          icon: <Activity className="h-4 w-4" />,
          label: t(messages, 'series.statsLiveTitle'),
          value: liveCount,
          desc: t(messages, 'series.statsLiveDesc'),
        },
        {
          icon: <Boxes className="h-4 w-4" />,
          label: t(messages, 'series.statsSoldTitle'),
          value: totalPurchased,
          desc: t(messages, 'series.statsSoldDesc'),
        },
        {
          icon: <Sparkles className="h-4 w-4" />,
          label: t(messages, 'series.statsClaimedTitle'),
          value: totalClaimed,
          desc: t(messages, 'series.statsClaimedDesc'),
        },
        {
          icon: <RadioTower className="h-4 w-4" />,
          label: t(messages, 'series.statsRefillTitle'),
          value: refillCount,
          desc: t(messages, 'series.statsRefillDesc'),
        },
      ]}
    />
  );
}

function PulseCardsFallback({ messages }: { messages: Record<string, unknown> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        {
          icon: <Activity className="h-4 w-4" />,
          label: t(messages, 'series.statsLiveTitle'),
          desc: t(messages, 'series.statsLiveDesc'),
        },
        {
          icon: <Boxes className="h-4 w-4" />,
          label: t(messages, 'series.statsSoldTitle'),
          desc: t(messages, 'series.statsSoldDesc'),
        },
        {
          icon: <Sparkles className="h-4 w-4" />,
          label: t(messages, 'series.statsClaimedTitle'),
          desc: t(messages, 'series.statsClaimedDesc'),
        },
        {
          icon: <RadioTower className="h-4 w-4" />,
          label: t(messages, 'series.statsRefillTitle'),
          desc: t(messages, 'series.statsRefillDesc'),
        },
      ].map((item) => (
        <Card
          key={item.label}
          className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
        >
          <CardContent className="p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center border-2 border-foreground bg-accent/15 text-foreground">
              {item.icon}
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </p>
            <Skeleton className="mt-3 h-9 w-20" />
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function SeriesBoardSection({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Record<string, unknown>;
}) {
  const { items, error } = await getSeriesCollection();

  if (error) {
    return (
      <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
        <CardHeader className="border-b-4 border-foreground bg-muted/35">
          <CardTitle className="jy-display text-base uppercase">
            {t(messages, 'series.sectionBoard')}
          </CardTitle>
          <CardDescription>{t(messages, 'series.sectionBoardDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t(messages, 'common.subgraphErrorPrefix')}: {error}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
        <CardHeader className="border-b-4 border-foreground bg-muted/35">
          <CardTitle className="jy-display text-base uppercase">
            {t(messages, 'series.sectionBoard')}
          </CardTitle>
          <CardDescription>{t(messages, 'series.sectionBoardDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            title={t(messages, 'series.emptyTitle')}
            description={t(messages, 'series.emptyDesc')}
            action={
              <Button asChild>
                <Link href={`/${locale}/create`}>{t(messages, 'nav.create')}</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return <SeriesList locale={locale} items={items} messages={messages} />;
}

export default async function SeriesExplorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const p = await params;
  const locale: Locale = isLocale(p.locale) ? p.locale : 'en';
  const { messages } = getLocaleAndMessages(locale);

  return (
    <div className="space-y-8 py-6">
      <section className="relative overflow-hidden border-4 border-foreground bg-foreground text-background shadow-[8px_8px_0_0_var(--color-shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(720px_300px_at_12%_18%,hsl(140_78%_45%/0.24),transparent_58%),radial-gradient(560px_260px_at_88%_16%,hsl(40_95%_55%/0.18),transparent_52%)]" />
        <div className="absolute inset-0 bg-[url('/sprites/scanlines.png')] opacity-20 mix-blend-overlay" />
        <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              <RadioTower className="h-3.5 w-3.5" />
              {t(messages, 'series.kicker')}
            </p>
            <div className="space-y-3">
              <h1 className="jy-display text-3xl uppercase leading-tight sm:text-4xl lg:text-5xl">
                {t(messages, 'series.exploreTitle')}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-background/88 sm:text-base">
                {t(messages, 'series.exploreDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
              <Suspense fallback={<HeroStatsFallback messages={messages} />}>
                <HeroStatsContent messages={messages} />
              </Suspense>
            </div>
          </div>

          <div className="border-2 border-background/30 bg-background/10 p-4 backdrop-blur-[2px]">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-accent/90">
              <span>{t(messages, 'series.featuredTitle')}</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <Suspense fallback={<FeaturedSeriesFallback />}>
              <FeaturedSeriesPanel locale={locale} messages={messages} />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono tracking-[0.3em] text-accent">01</span>
            <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
          </div>
          <div className="space-y-2">
            <h2 className="jy-display text-2xl uppercase text-foreground">
              {t(messages, 'series.sectionPulse')}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {t(messages, 'series.sectionPulseDesc')}
            </p>
          </div>
        </div>

        <Suspense fallback={<PulseCardsFallback messages={messages} />}>
          <PulseCardsContent messages={messages} />
        </Suspense>
      </section>

      <section className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono tracking-[0.3em] text-accent">02</span>
            <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
          </div>
          <div className="space-y-2">
            <h2 className="jy-display text-2xl uppercase text-foreground">
              {t(messages, 'series.sectionBoard')}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {t(messages, 'series.sectionBoardDesc')}
            </p>
          </div>
        </div>

        <Suspense fallback={<SeriesListSkeleton />}>
          <SeriesBoardSection locale={locale} messages={messages} />
        </Suspense>
      </section>
    </div>
  );
}
