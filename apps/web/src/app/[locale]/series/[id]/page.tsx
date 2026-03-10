import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { formatEther } from 'viem';
import { Sparkles, Ticket } from 'lucide-react';

import SeriesAdmin from '@/components/series/series-admin';
import SeriesFunding from '@/components/series/series-funding';
import SeriesDetailTabs from '@/components/series/series-detail-tabs';
import SeriesHeroBuyButton from '@/components/series/series-hero-buy-button';
import SeriesOwnedPanel from '@/components/series/series-owned-panel';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLocaleAndMessages, t } from '@/i18n/server';
import { getSeriesState } from '@/lib/series';
import {
  getSeriesDetail,
  type AssetConfig,
  type LeftoverTransfer,
  type SeriesDetail,
} from '@/lib/series-detail';
import { cn } from '@/lib/utils';

function isHexAddress(value: string): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x') && value.length === 42;
}

function isZeroAddress(value: string) {
  return value.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

function shortAddr(value: string) {
  if (!value || value.length < 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function fmtTime(unixSeconds?: string | null) {
  if (!unixSeconds) return null;
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatBps(bps: number) {
  return `${bps / 100}%`;
}

function formatProgress(series: Pick<SeriesDetail, 'totalPurchased' | 'maxSupply'>) {
  const soldCount = Number(series.totalPurchased);
  const maxCount = Number(series.maxSupply);
  if (!Number.isFinite(soldCount) || !Number.isFinite(maxCount) || maxCount <= 0) return 0;
  return Math.min(100, Math.round((soldCount / maxCount) * 100));
}

function formatHumanValue(value: string, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat(undefined, {
    notation: n >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: decimals,
  }).format(n);
}

function formatPaymentLabel(series: SeriesDetail, messages: Record<string, unknown>) {
  if (isZeroAddress(series.paymentToken)) {
    return `${t(messages, 'series.paymentNative')} (ETH)`;
  }
  return series.paymentSymbol
    ? `${series.paymentSymbol}${series.paymentDecimals != null ? ` (${series.paymentDecimals})` : ''}`
    : shortAddr(series.paymentToken);
}

function formatPrice(series: SeriesDetail, messages: Record<string, unknown>) {
  if (isZeroAddress(series.paymentToken)) {
    try {
      return `${formatEther(BigInt(series.price))} ETH`;
    } catch {
      return `${series.price} ${t(messages, 'series.paymentNative')}`;
    }
  }
  return `${series.price} ${series.paymentSymbol ?? shortAddr(series.paymentToken)}`;
}

function formatRevenue(series: SeriesDetail, messages: Record<string, unknown>) {
  if (!series.totalRevenue || series.totalRevenue === '0') {
    return `0 ${isZeroAddress(series.paymentToken) ? 'ETH' : (series.paymentSymbol ?? '')}`.trim();
  }

  if (isZeroAddress(series.paymentToken)) {
    try {
      return `${formatEther(BigInt(series.totalRevenue))} ETH`;
    } catch {
      return `${series.totalRevenue} ${t(messages, 'series.paymentNative')}`;
    }
  }

  return `${formatHumanValue(series.totalRevenue)} ${series.paymentSymbol ?? shortAddr(series.paymentToken)}`;
}

function statusClass(state: ReturnType<typeof getSeriesState>) {
  if (state === 'live') return 'border-foreground bg-accent text-accent-foreground';
  if (state === 'awaitingRefill')
    return 'border-foreground bg-[color:var(--color-outline-hot)] text-foreground';
  if (state === 'soldOut')
    return 'border-[color:var(--color-danger-border)] bg-destructive text-destructive-foreground';
  return 'border-border bg-muted text-muted-foreground';
}

function leftoverPolicyLabel(mode: number, messages: Record<string, unknown>) {
  if (mode === 1) return t(messages, 'admin.leftoverDonate');
  if (mode === 2) return t(messages, 'admin.leftoverBurn');
  return t(messages, 'admin.leftoverReturn');
}

function getSeriesDisplayName(series: SeriesDetail, messages: Record<string, unknown>) {
  return series.nftName?.trim().length
    ? series.nftName
    : `${t(messages, 'series.detailTitle')} #${series.id}`;
}

function NumberedSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono tracking-[0.3em] text-accent">{number}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
        </div>
        <div className="space-y-2">
          <h2 className="jy-display text-2xl uppercase text-foreground">{title}</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className={cn('text-right text-sm text-foreground', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function HeroInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-background/20 py-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.16em] text-background/60">{label}</span>
      <span className="text-right text-sm text-background">{value}</span>
    </div>
  );
}

function AssetConfigCard({
  config,
  messages,
}: {
  config: AssetConfig;
  messages: Record<string, unknown>;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden border-2 border-foreground bg-background/85 shadow-[5px_5px_0_0_var(--color-shadow)]">
      <div className="space-y-4 border-b-2 border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="jy-display text-sm uppercase text-foreground">
              {config.assetType ?? t(messages, 'common.notAvailable')}
            </p>
            <p className="font-mono text-xs tracking-[0.08em] break-all text-foreground">
              {config.assetContract}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge
              variant={config.whitelisted ? 'secondary' : 'outline'}
              className="rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
            >
              {config.whitelisted
                ? t(messages, 'series.whitelisted')
                : t(messages, 'series.notWhitelisted')}
            </Badge>
            <Badge
              variant={config.configured ? 'secondary' : 'outline'}
              className="rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
            >
              {config.configured
                ? t(messages, 'series.configured')
                : t(messages, 'series.pendingConfig')}
            </Badge>
          </div>
        </div>
      </div>
      <div className="grid flex-1 gap-3 p-4 sm:grid-cols-2">
        <div className="border-2 border-border/60 bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t(messages, 'series.maxShareLabel')}
          </p>
          <p className="mt-2 jy-display text-xl uppercase text-foreground">
            {formatBps(config.maxShareBps)}
          </p>
        </div>
        <div className="border-2 border-border/60 bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t(messages, 'series.balShort')}
          </p>
          <p className="mt-2 jy-display text-xl uppercase text-foreground">
            {formatHumanValue(config.currentBalance)}
          </p>
        </div>
        <div className="border-2 border-border/60 bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t(messages, 'series.depShort')}
          </p>
          <p className="mt-2 jy-display text-xl uppercase text-foreground">
            {formatHumanValue(config.totalDeposited)}
          </p>
        </div>
        <div className="border-2 border-border/60 bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t(messages, 'series.outShort')}
          </p>
          <p className="mt-2 jy-display text-xl uppercase text-foreground">
            {formatHumanValue(config.totalDistributed)}
          </p>
        </div>
      </div>
    </article>
  );
}

function LeftoverCard({
  item,
  messages,
}: {
  item: LeftoverTransfer;
  messages: Record<string, unknown>;
}) {
  return (
    <div className="grid gap-3 border-2 border-border/60 bg-background/75 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
          >
            {item.assetType}
          </Badge>
          {item.tokenId && item.tokenId !== '0' ? (
            <Badge
              variant="outline"
              className="rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
            >
              #{item.tokenId}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className="rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
          >
            {item.amount}
          </Badge>
        </div>
        <p className="font-mono text-xs tracking-[0.08em] text-foreground">{item.assetContract}</p>
      </div>

      <div className="grid gap-2 text-sm">
        <InfoRow
          label={t(messages, 'series.leftoverRecipient')}
          value={shortAddr(item.recipient)}
          mono
        />
        <InfoRow
          label={t(messages, 'series.leftoverTime')}
          value={fmtTime(item.timestamp) ?? '-'}
        />
      </div>
    </div>
  );
}

export default async function SeriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const id = p.id;
  const { messages } = getLocaleAndMessages(p.locale);
  const sp = searchParams ? await searchParams : {};

  const initialBoxIdRaw = sp.boxId;
  const initialBoxId =
    typeof initialBoxIdRaw === 'string' && initialBoxIdRaw.length ? initialBoxIdRaw : undefined;
  const tabRaw = sp.tab;
  const initialAction =
    tabRaw === 'open' || tabRaw === 'claim' || tabRaw === 'buy' ? tabRaw : undefined;
  const panelRaw = sp.panel;
  const initialPanel =
    initialAction != null
      ? 'owned'
      : panelRaw === 'owned' || panelRaw === 'admin'
        ? panelRaw
        : 'overview';

  const { series, error } = await getSeriesDetail(id);

  if (!series && !error) notFound();
  if (!series && error) {
    return (
      <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
        <CardHeader className="border-b-4 border-foreground bg-muted/35">
          <CardTitle className="jy-display text-sm uppercase">
            {t(messages, 'seriesPage.loadFailedTitle')}
          </CardTitle>
          <CardDescription>{t(messages, 'seriesPage.loadFailedDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t(messages, 'common.errorPrefix')}: {error}
        </CardContent>
      </Card>
    );
  }

  const s = series as SeriesDetail;
  const state = getSeriesState(s);
  const progress = formatProgress(s);
  const startsAt = fmtTime(s.startTime);
  const endsAt = fmtTime(s.endTime) ?? t(messages, 'series.unlimited');
  const displayName = getSeriesDisplayName(s, messages);
  const paymentLabel = formatPaymentLabel(s, messages);
  const seriesAddress = isHexAddress(s.seriesAddress) ? (s.seriesAddress as `0x${string}`) : null;
  const prizePoolAddress = isHexAddress(s.prizePoolAddress)
    ? (s.prizePoolAddress as `0x${string}`)
    : null;
  const oracleAddress = isHexAddress(s.oracle) ? (s.oracle as `0x${string}`) : null;

  const overviewContent = (
    <div className="space-y-6">
      <NumberedSection
        number="01"
        title={t(messages, 'series.sectionRuntime')}
        description={t(messages, 'series.sectionRuntimeDesc')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
            <CardHeader className="border-b-4 border-foreground bg-muted/35">
              <CardTitle className="jy-display text-base uppercase">
                {t(messages, 'series.metricWindow')}
              </CardTitle>
              <CardDescription>{t(messages, 'series.runtimeWindowDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <InfoRow
                label={t(messages, 'series.starts')}
                value={startsAt ?? t(messages, 'common.notAvailable')}
              />
              <InfoRow label={t(messages, 'series.ends')} value={endsAt} />
              <InfoRow
                label={t(messages, 'series.statusLabel')}
                value={t(messages, `series.state.${state}`)}
              />
              <InfoRow label={t(messages, 'series.paymentToken')} value={paymentLabel} />
            </CardContent>
          </Card>

          <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
            <CardHeader className="border-b-4 border-foreground bg-muted/35">
              <CardTitle className="jy-display text-base uppercase">
                {t(messages, 'series.runtimeContractsTitle')}
              </CardTitle>
              <CardDescription>{t(messages, 'series.runtimeContractsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <InfoRow
                label={t(messages, 'series.collectionAddress')}
                value={shortAddr(s.nftAddress)}
                mono
              />
              <InfoRow
                label={t(messages, 'series.prizePool')}
                value={shortAddr(s.prizePoolAddress)}
                mono
              />
              <InfoRow
                label={t(messages, 'create.configGuard')}
                value={shortAddr(s.configGuard)}
                mono
              />
              <InfoRow label={t(messages, 'create.buyGuard')} value={shortAddr(s.buyGuard)} mono />
              <InfoRow label={t(messages, 'series.oracle')} value={shortAddr(s.oracle)} mono />
            </CardContent>
          </Card>
        </div>
      </NumberedSection>

      <NumberedSection
        number="02"
        title={t(messages, 'series.sectionRewards')}
        description={t(messages, 'series.sectionRewardsDesc')}
      >
        <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
          <CardHeader className="border-b-4 border-foreground bg-muted/35">
            <CardTitle className="jy-display text-base uppercase">
              {t(messages, 'series.assetConfigsTitle')}
            </CardTitle>
            <CardDescription>{t(messages, 'series.assetConfigsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            {s.assetConfigs.length ? (
              s.assetConfigs.map((config) => (
                <AssetConfigCard key={config.id} config={config} messages={messages} />
              ))
            ) : (
              <EmptyState
                className="md:col-span-2 py-14"
                title={t(messages, 'series.noAssets')}
                description={t(messages, 'series.assetConfigsDesc')}
              />
            )}
          </CardContent>
        </Card>
      </NumberedSection>

      <NumberedSection
        number="03"
        title={t(messages, 'leftovers.title')}
        description={t(messages, 'leftovers.desc')}
      >
        <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
          <CardHeader className="border-b-4 border-foreground bg-muted/35">
            <CardTitle className="jy-display text-base uppercase">
              {t(messages, 'series.leftoverTimelineTitle')}
            </CardTitle>
            <CardDescription>{t(messages, 'series.leftoverTimelineDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {s.leftoverTransfers.length ? (
              s.leftoverTransfers.map((item) => (
                <LeftoverCard key={item.id} item={item} messages={messages} />
              ))
            ) : (
              <EmptyState
                className="py-14"
                title={t(messages, 'leftovers.noTransfers')}
                description={t(messages, 'leftovers.desc')}
              />
            )}
          </CardContent>
        </Card>
      </NumberedSection>
    </div>
  );

  const adminContent =
    seriesAddress && prizePoolAddress ? (
      <div className="grid gap-4">
        <SeriesAdmin
          seriesAddress={seriesAddress}
          price={s.price}
          startTime={s.startTime}
          endTime={s.endTime}
          maxSupply={s.maxSupply}
          totalPurchased={s.totalPurchased}
          totalClaimed={s.totalClaimed}
        />
        <SeriesFunding prizePoolAddress={prizePoolAddress} />
      </div>
    ) : (
      <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
        <CardHeader className="border-b-4 border-foreground bg-muted/35">
          <CardTitle className="jy-display text-base uppercase">
            {t(messages, 'series.missingAddressesTitle')}
          </CardTitle>
          <CardDescription>{t(messages, 'series.missingAddressesDesc')}</CardDescription>
        </CardHeader>
      </Card>
    );

  return (
    <div className="space-y-8 py-6">
      <section className="relative overflow-hidden border-4 border-foreground bg-foreground text-background shadow-[8px_8px_0_0_var(--color-shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(760px_320px_at_12%_16%,hsl(140_78%_45%/0.22),transparent_58%),radial-gradient(560px_260px_at_88%_14%,hsl(40_95%_55%/0.18),transparent_52%)]" />
        <div className="absolute inset-0 bg-[url('/sprites/scanlines.png')] opacity-20 mix-blend-overlay" />
        <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                <Ticket className="h-3.5 w-3.5" />
                {t(messages, 'series.detailKicker')}
              </p>
              <Badge
                className={cn(
                  'rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]',
                  statusClass(state)
                )}
              >
                {t(messages, `series.state.${state}`)}
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="jy-display text-3xl uppercase leading-tight sm:text-4xl xl:text-5xl">
                {displayName}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-background/88 sm:text-base">
                {t(messages, 'series.detailDesc')}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-background/66">
                {s.nftSymbol ? `${s.nftSymbol} · ` : ''}
                {t(messages, 'series.creator')}: {shortAddr(s.creator.address)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-background/20 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                  {t(messages, 'series.metricSupply')}
                </div>
                <div className="mt-2 jy-display text-2xl text-background">
                  {s.totalPurchased}/{s.maxSupply}
                </div>
                <div className="mt-3 h-2 border border-background/30 bg-background/10">
                  <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="border border-background/20 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                  {t(messages, 'series.metricLifecycle')}
                </div>
                <div className="mt-2 jy-display text-2xl text-background">
                  {s.totalOpened}/{s.totalClaimed}
                </div>
                <p className="mt-2 text-sm leading-6 text-background/72">
                  {t(messages, 'series.opened')} / {t(messages, 'series.claimed')}
                </p>
              </div>
              <div className="border border-background/20 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                  {t(messages, 'series.metricAssets')}
                </div>
                <div className="mt-2 jy-display text-2xl text-background">
                  {s.activeAssetTypeCount}
                </div>
                <p className="mt-2 text-sm leading-6 text-background/72">
                  {t(messages, 'series.assetCapShort')}: {s.maxAssetTypesPerOpening}
                </p>
              </div>
            </div>
          </div>

          <div className="border-2 border-background/30 bg-background/10 p-4 backdrop-blur-[2px]">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-accent/90">
              <span>{t(messages, 'series.featuredTitle')}</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="border border-background/20 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                    {t(messages, 'series.price')}
                  </div>
                  <div className="mt-2 jy-display text-lg text-background">
                    {formatPrice(s, messages)}
                  </div>
                </div>
                <div className="border border-background/20 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                    {t(messages, 'series.metricRevenue')}
                  </div>
                  <div className="mt-2 jy-display text-lg text-background">
                    {formatRevenue(s, messages)}
                  </div>
                </div>
              </div>

              <div className="border border-background/20 bg-black/20 p-3">
                <HeroInfoRow
                  label={t(messages, 'series.metricWindow')}
                  value={`${startsAt ?? t(messages, 'common.notAvailable')} -> ${endsAt}`}
                />
                <HeroInfoRow
                  label={t(messages, 'series.configLocked')}
                  value={
                    s.configLocked ? t(messages, 'admin.lockedYes') : t(messages, 'admin.lockedNo')
                  }
                />
                <HeroInfoRow
                  label={t(messages, 'series.leftoverPolicy')}
                  value={leftoverPolicyLabel(s.leftoverMode, messages)}
                />
                <HeroInfoRow
                  label={t(messages, 'series.prizePool')}
                  value={shortAddr(s.prizePoolAddress)}
                />
              </div>

              {seriesAddress ? (
                <SeriesHeroBuyButton seriesAddress={seriesAddress} price={s.price} />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <SeriesDetailTabs
        creatorAddress={s.creator.address}
        initialPanel={initialPanel}
        overview={overviewContent}
        owned={
          seriesAddress && oracleAddress && isHexAddress(s.nftAddress) ? (
            <SeriesOwnedPanel
              seriesId={s.id}
              seriesAddress={seriesAddress}
              oracleAddress={oracleAddress}
              nftAddress={s.nftAddress as `0x${string}`}
              initialBoxId={initialBoxId}
              initialAction={initialAction}
            />
          ) : (
            <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
              <CardHeader className="border-b-4 border-foreground bg-muted/35">
                <CardTitle className="jy-display text-base uppercase">
                  {t(messages, 'series.missingAddressesTitle')}
                </CardTitle>
                <CardDescription>{t(messages, 'series.missingAddressesDesc')}</CardDescription>
              </CardHeader>
            </Card>
          )
        }
        admin={adminContent}
      />
    </div>
  );
}
