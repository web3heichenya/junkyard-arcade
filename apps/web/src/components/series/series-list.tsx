import Link from 'next/link';
import { formatEther } from 'viem';
import { Boxes, Clock3, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/i18n/i18n';
import { t } from '@/i18n/server';
import type { SeriesItem } from '@/lib/series';
import { getSeriesState } from '@/lib/series';
import { cn } from '@/lib/utils';

function isZeroAddress(addr: string) {
  return addr.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

function shortAddr(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function fmtTime(unixSeconds: string, localeTag: string) {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n * 1000);
  return d.toLocaleString(localeTag, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatPrice(item: SeriesItem, messages: Record<string, unknown>) {
  if (!isZeroAddress(item.paymentToken)) {
    return `${item.price} · ${shortAddr(item.paymentToken)}`;
  }

  try {
    return `${formatEther(BigInt(item.price))} ETH`;
  } catch {
    return `${item.price} ${t(messages, 'series.paymentNative')}`;
  }
}

function formatProgress(sold: string, max: string) {
  const soldCount = Number(sold);
  const maxCount = Number(max);
  if (!Number.isFinite(soldCount) || !Number.isFinite(maxCount) || maxCount <= 0) return 0;
  return Math.min(100, Math.round((soldCount / maxCount) * 100));
}

function statusClass(state: ReturnType<typeof getSeriesState>) {
  if (state === 'live') return 'border-foreground bg-accent text-accent-foreground';
  if (state === 'awaitingRefill')
    return 'border-foreground bg-[color:var(--color-outline-hot)] text-foreground';
  if (state === 'soldOut')
    return 'border-[color:var(--color-danger-border)] bg-destructive text-destructive-foreground';
  return 'border-border bg-muted text-muted-foreground';
}

function getSeriesDisplayName(item: SeriesItem, messages: Record<string, unknown>) {
  return item.nftName?.trim().length
    ? item.nftName
    : `${t(messages, 'series.detailTitle')} #${item.id}`;
}

export function SeriesList({
  locale,
  items,
  messages,
}: {
  locale: Locale;
  items: SeriesItem[];
  messages: Record<string, unknown>;
}) {
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {items.map((item) => {
        const start = fmtTime(item.startTime, localeTag);
        const end = fmtTime(item.endTime, localeTag);
        const payment = isZeroAddress(item.paymentToken)
          ? t(messages, 'series.paymentNative')
          : shortAddr(item.paymentToken);
        const state = getSeriesState(item);
        const progress = formatProgress(item.totalPurchased, item.maxSupply);
        const showRefillBadge = state === 'awaitingRefill';

        return (
          <Link
            key={item.id}
            href={`/${locale}/series/${item.id}`}
            aria-label={getSeriesDisplayName(item, messages)}
            className="group block"
          >
            <Card className="h-full overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)] transition-[transform,box-shadow] duration-150 group-hover:-translate-y-1 group-hover:shadow-[10px_10px_0_0_var(--color-shadow)]">
              <CardHeader className="gap-4 border-b-4 border-foreground bg-muted/35 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    {state !== 'awaitingRefill' ? (
                      <Badge
                        className={cn(
                          'rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]',
                          statusClass(state)
                        )}
                      >
                        {t(messages, `series.state.${state}`)}
                      </Badge>
                    ) : null}
                    <CardTitle className="jy-display text-xl uppercase">
                      {getSeriesDisplayName(item, messages)}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs tracking-[0.08em]">
                      {item.nftSymbol ? `${item.nftSymbol} · ` : ''}
                      {shortAddr(item.seriesAddress)}
                    </CardDescription>
                  </div>

                  {showRefillBadge ? (
                    <Badge
                      className={cn(
                        'rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]',
                        statusClass(state)
                      )}
                    >
                      {t(messages, 'series.state.awaitingRefill')}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="grid gap-5 p-5">
                <div className="grid gap-3 border-2 border-border/60 bg-background/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {t(messages, 'series.metricSupply')}
                      </p>
                      <p className="jy-display mt-2 text-2xl uppercase text-foreground">
                        {item.totalPurchased}/{item.maxSupply}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{progress}%</p>
                  </div>
                  <div className="h-3 border border-foreground bg-muted">
                    <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="border-2 border-border/60 bg-background/75 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t(messages, 'series.metricLifecycle')}
                    </div>
                    <p className="text-sm leading-6 text-foreground">
                      {t(messages, 'series.opened')}:{' '}
                      <span className="font-mono">{item.totalOpened}</span>
                    </p>
                    <p className="text-sm leading-6 text-foreground">
                      {t(messages, 'series.claimed')}:{' '}
                      <span className="font-mono">{item.totalClaimed}</span>
                    </p>
                  </div>

                  <div className="border-2 border-border/60 bg-background/75 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <Boxes className="h-3.5 w-3.5" />
                      {t(messages, 'series.metricAssets')}
                    </div>
                    <p className="text-sm leading-6 text-foreground">
                      {t(messages, 'series.assetCapShort')}:{' '}
                      <span className="font-mono">{item.maxAssetTypesPerOpening}</span>
                    </p>
                    <p className="text-sm leading-6 text-foreground">
                      {t(messages, 'series.activeAssetsShort')}:{' '}
                      <span className="font-mono">{item.activeAssetTypeCount}</span>
                    </p>
                  </div>

                  <div className="border-2 border-border/60 bg-background/75 p-4 md:col-span-2">
                    <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {t(messages, 'series.metricWindow')}
                    </div>
                    <div className="grid gap-2 text-sm leading-6 text-foreground sm:grid-cols-2">
                      <p>
                        {t(messages, 'series.starts')}:{' '}
                        <span className="font-mono">
                          {start ?? t(messages, 'common.notAvailable')}
                        </span>
                      </p>
                      <p>
                        {t(messages, 'series.ends')}:{' '}
                        <span className="font-mono">{end ?? t(messages, 'series.unlimited')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border/60 pt-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {t(messages, 'series.price')}
                    </p>
                    <p className="jy-display mt-2 text-lg uppercase text-foreground">
                      {formatPrice(item, messages)}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {t(messages, 'series.paymentToken')}: {payment}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function SeriesListSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
        >
          <CardHeader className="gap-4 border-b-4 border-foreground bg-muted/35 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-52" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 p-5">
            <div className="grid gap-3 border-2 border-border/60 bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                </div>
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-3 border-2 border-border/60 bg-background/75 p-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-3 border-2 border-border/60 bg-background/75 p-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-3 border-2 border-border/60 bg-background/75 p-4 md:col-span-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border/60 pt-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-28" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
