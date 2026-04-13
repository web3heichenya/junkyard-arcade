'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CheckCircle2, Gift, Sparkles, Ticket, Wallet } from 'lucide-react';
import { injected } from '@wagmi/core';
import { useAccount, useConnect } from 'wagmi';

import { erc721MetadataAbi } from '@/abi/erc721Metadata';
import { randomnessProviderAbi } from '@/abi/randomnessProvider';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSeriesState } from '@/lib/series';
import { subgraphRequest } from '@/lib/subgraph';
import { cn } from '@/lib/utils';
import { useI18n } from '@/providers/i18n-provider';

type BlindBoxStatus = 'UNOPENED' | 'OPENED' | 'CLAIMED' | 'BURNED';

type BlindBox = {
  id: string;
  tokenId: string;
  status: BlindBoxStatus;
  requestId?: string | null;
  purchasedAt: string;
  openedAt?: string | null;
  claimedAt?: string | null;
  series: {
    id: string;
    nftAddress: string;
    seriesAddress: string;
    oracle: string;
    maxSupply: string;
    totalPurchased: string;
    totalOpened: string;
    totalClaimed: string;
    startTime: string;
    endTime: string;
    activeAssetTypeCount: number;
  };
};

type UserData = {
  user: {
    id: string;
    address: string;
    totalPurchased: string;
    totalOpened: string;
    totalClaimed: string;
    lastActivityAt: string;
    blindBoxes: BlindBox[];
  } | null;
};

type BoxWithSeriesMeta = BlindBox & {
  seriesName: string | null;
  seriesSymbol: string | null;
};

type QueueItemProps = {
  box: BoxWithSeriesMeta;
  resolution: BoxUiState;
  locale: string;
  t: (key: string) => string;
  localeTag: string;
};

type BoxUiState = 'ready-open' | 'awaiting-randomness' | 'ready-claim' | 'claimed' | 'burned';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function fmtTime(unixSeconds: string | null | undefined, localeTag: string) {
  if (!unixSeconds) return null;
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toLocaleString(localeTag, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function shortAddr(value?: string) {
  if (!value || value.length < 10) return value ?? '';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function isHexAddress(value: string): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x') && value.length === 42;
}

function isBytes32(value: string | null | undefined): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x') && value.length === 66;
}

function boxAction(state: BoxUiState) {
  if (state === 'ready-open') return 'open';
  if (state === 'ready-claim') return 'claim';
  return 'view';
}

function getBoxUiState(box: BlindBox, fulfilledById: Record<string, boolean>): BoxUiState {
  if (box.status === 'UNOPENED') return 'ready-open';
  if (box.status === 'OPENED') return fulfilledById[box.id] ? 'ready-claim' : 'awaiting-randomness';
  if (box.status === 'CLAIMED') return 'claimed';
  return 'burned';
}

function statusClass(state: BoxUiState) {
  if (state === 'ready-open' || state === 'ready-claim') {
    return 'border-foreground bg-accent text-accent-foreground';
  }
  if (state === 'awaiting-randomness')
    return 'border-foreground bg-[color:var(--color-outline-hot)] text-foreground';
  if (state === 'claimed')
    return 'border-[color:var(--color-secondary-border)] bg-secondary text-secondary-foreground';
  return 'border-[color:var(--color-danger-border)] bg-destructive text-destructive-foreground';
}

function statusLabel(state: BoxUiState, box: BlindBox, t: (key: string) => string) {
  if (state === 'awaiting-randomness') return t('actions.awaitingRandomness');
  if (state === 'ready-claim') return t('actions.claimReady');
  return t(`status.${box.status}`);
}

function actionHint(state: BoxUiState, t: (key: string) => string) {
  if (state === 'ready-open') return t('me.openNow');
  if (state === 'ready-claim') return t('me.claimNow');
  if (state === 'awaiting-randomness') return t('actions.awaitingRandomness');
  return t('me.viewSeries');
}

async function attachSeriesMetadata(items: BlindBox[]): Promise<BoxWithSeriesMeta[]> {
  const nftAddresses = [
    ...new Set(items.map((item) => item.series.nftAddress).filter(isHexAddress)),
  ];
  const metadataByAddress = new Map<string, { name: string | null; symbol: string | null }>();

  if (nftAddresses.length) {
    try {
      const contracts = nftAddresses.flatMap((address) => [
        { address, abi: erc721MetadataAbi, functionName: 'name' as const },
        { address, abi: erc721MetadataAbi, functionName: 'symbol' as const },
      ]);
      const results = await publicClient.multicall({
        contracts,
        allowFailure: true,
      });

      for (let i = 0; i < nftAddresses.length; i += 1) {
        const nameResult = results[i * 2];
        const symbolResult = results[i * 2 + 1];
        metadataByAddress.set(nftAddresses[i], {
          name: nameResult?.status === 'success' ? nameResult.result : null,
          symbol: symbolResult?.status === 'success' ? symbolResult.result : null,
        });
      }
    } catch {
      for (const address of nftAddresses) {
        metadataByAddress.set(address, { name: null, symbol: null });
      }
    }
  }

  return items.map((item) => ({
    ...item,
    seriesName: metadataByAddress.get(item.series.nftAddress)?.name ?? null,
    seriesSymbol: metadataByAddress.get(item.series.nftAddress)?.symbol ?? null,
  }));
}

function QueueCard({ box, resolution, locale, t, localeTag }: QueueItemProps) {
  const action = boxAction(resolution);
  const href =
    action === 'open'
      ? `/${locale}/series/${box.series.id}?boxId=${box.tokenId}&tab=open`
      : action === 'claim'
        ? `/${locale}/series/${box.series.id}?boxId=${box.tokenId}&tab=claim`
        : `/${locale}/series/${box.series.id}?boxId=${box.tokenId}`;
  const cta =
    action === 'open'
      ? t('me.openNow')
      : action === 'claim'
        ? t('me.claimNow')
        : t('me.viewSeries');

  return (
    <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
      <CardHeader className="border-b-4 border-foreground bg-muted/35 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="jy-display text-base uppercase">
              {box.seriesName || `${t('me.seriesTitle')} #${box.series.id}`}
            </CardTitle>
            <CardDescription>
              {t('me.boxTitle')} #{box.tokenId}
              {box.seriesSymbol ? ` · ${box.seriesSymbol}` : ''}
            </CardDescription>
          </div>
          <Badge
            className={cn(
              'rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]',
              statusClass(resolution)
            )}
          >
            {statusLabel(resolution, box, t)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 md:grid-cols-[88px_minmax(0,1fr)]">
        <div className="flex h-24 items-center justify-center border-2 border-foreground bg-background/70">
          <Image
            src="/logo.png"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 object-contain pixelated"
          />
        </div>
        <div className="space-y-4">
          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>
              {t('me.bought')}:{' '}
              <span className="font-mono text-foreground">
                {fmtTime(box.purchasedAt, localeTag) ?? '-'}
              </span>
            </p>
            {box.openedAt ? (
              <p>
                {t('me.opened')}:{' '}
                <span className="font-mono text-foreground">
                  {fmtTime(box.openedAt, localeTag) ?? '-'}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button asChild size="action">
              <Link href={href}>{cta}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BoxRackCard({ box, resolution, locale, t, localeTag }: QueueItemProps) {
  const seriesState = getSeriesState(box.series);
  const sold = Number(box.series.totalPurchased || '0');
  const max = Number(box.series.maxSupply || '0');
  const progress = max > 0 ? Math.min(100, Math.round((sold / max) * 100)) : 0;
  const action = boxAction(resolution);
  const href =
    action === 'open'
      ? `/${locale}/series/${box.series.id}?boxId=${box.tokenId}&tab=open`
      : action === 'claim'
        ? `/${locale}/series/${box.series.id}?boxId=${box.tokenId}&tab=claim`
        : `/${locale}/series/${box.series.id}?boxId=${box.tokenId}`;

  return (
    <Link
      href={href}
      className="group overflow-hidden border-4 border-foreground bg-card text-left shadow-[8px_8px_0_0_var(--color-shadow)] transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_var(--color-shadow)]"
    >
      <div className="relative flex h-44 items-center justify-center border-b-4 border-foreground bg-muted/35">
        <Image
          src="/logo.png"
          alt=""
          width={96}
          height={96}
          className="h-24 w-24 object-contain pixelated"
        />
        <div className="absolute left-3 top-3">
          <Badge
            className={cn(
              'rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]',
              statusClass(resolution)
            )}
          >
            {statusLabel(resolution, box, t)}
          </Badge>
        </div>
        <div className="absolute right-3 top-3">
          <Badge
            variant="outline"
            className="rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
          >
            {t(`series.state.${seriesState}`)}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 p-5">
        <div className="space-y-1">
          <p className="jy-display text-base uppercase text-foreground">
            {box.seriesName || `${t('me.seriesTitle')} #${box.series.id}`}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {t('me.boxTitle')} #{box.tokenId}
            {box.seriesSymbol ? ` · ${box.seriesSymbol}` : ''}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>{t('series.metricSupply')}</span>
            <span>
              {box.series.totalPurchased}/{box.series.maxSupply}
            </span>
          </div>
          <div className="h-2 border border-foreground bg-muted">
            <div
              className="h-full bg-accent transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground">
          <p>
            {t('me.bought')}:{' '}
            <span className="font-mono text-foreground">
              {fmtTime(box.purchasedAt, localeTag) ?? '-'}
            </span>
          </p>
          {box.openedAt ? (
            <p>
              {t('me.opened')}:{' '}
              <span className="font-mono text-foreground">
                {fmtTime(box.openedAt, localeTag) ?? '-'}
              </span>
            </p>
          ) : null}
          {box.claimedAt ? (
            <p>
              {t('me.claimed')}:{' '}
              <span className="font-mono text-foreground">
                {fmtTime(box.claimedAt, localeTag) ?? '-'}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-sm">
          <span className="text-muted-foreground">{actionHint(resolution, t)}</span>
          <span className="font-mono text-foreground">{shortAddr(box.series.seriesAddress)}</span>
        </div>
      </div>
    </Link>
  );
}

function BoxesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
        >
          <Skeleton className="h-44 rounded-none border-b-4 border-foreground" />
          <CardContent className="grid gap-4 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MePage() {
  const { locale, t } = useI18n();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [boxes, setBoxes] = React.useState<BoxWithSeriesMeta[]>([]);
  const [fulfilledById, setFulfilledById] = React.useState<Record<string, boolean>>({});
  const [totals, setTotals] = React.useState({
    totalPurchased: '0',
    totalOpened: '0',
    totalClaimed: '0',
    lastActivityAt: '',
  });
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US';

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!address) {
        setBoxes([]);
        setTotals({
          totalPurchased: '0',
          totalOpened: '0',
          totalClaimed: '0',
          lastActivityAt: '',
        });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await subgraphRequest<UserData>(
          `
                    query MyBoxes($id: ID!) {
                      user(id: $id) {
                        id
                        address
                        totalPurchased
                        totalOpened
                        totalClaimed
                        lastActivityAt
                        blindBoxes(first: 100, orderBy: purchasedAt, orderDirection: desc) {
                          id
                          tokenId
                          status
                          requestId
                          purchasedAt
                          openedAt
                          claimedAt
                          series {
                            id
                            nftAddress
                            seriesAddress
                            oracle
                            maxSupply
                            totalPurchased
                            totalOpened
                            totalClaimed
                            startTime
                            endTime
                            activeAssetTypeCount
                          }
                        }
                      }
                    }
                    `,
          { id: address.toLowerCase() }
        );

        if (cancelled) return;
        const rawBoxes = data.user?.blindBoxes ?? [];
        const nextBoxes = await attachSeriesMetadata(rawBoxes);
        if (cancelled) return;

        setBoxes(nextBoxes);
        setTotals({
          totalPurchased: data.user?.totalPurchased ?? '0',
          totalOpened: data.user?.totalOpened ?? '0',
          totalClaimed: data.user?.totalClaimed ?? '0',
          lastActivityAt: data.user?.lastActivityAt ?? '',
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.unknownError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [address, t]);

  React.useEffect(() => {
    let cancelled = false;
    const openedBoxes = boxes.filter(
      (box) =>
        box.status === 'OPENED' && isHexAddress(box.series.oracle) && isBytes32(box.requestId)
    );

    if (!openedBoxes.length) {
      setFulfilledById({});
      return;
    }

    async function run() {
      try {
        const results = await publicClient.multicall({
          contracts: openedBoxes.map((box) => ({
            address: box.series.oracle as `0x${string}`,
            abi: randomnessProviderAbi,
            functionName: 'isFulfilled' as const,
            args: [box.requestId as `0x${string}`],
          })),
          allowFailure: true,
        });

        if (cancelled) return;
        const next: Record<string, boolean> = {};
        openedBoxes.forEach((box, index) => {
          next[box.id] =
            results[index]?.status === 'success' ? Boolean(results[index].result) : false;
        });
        setFulfilledById(next);
      } catch {
        if (!cancelled) {
          const next: Record<string, boolean> = {};
          openedBoxes.forEach((box) => {
            next[box.id] = false;
          });
          setFulfilledById(next);
        }
      }
    }

    void run();
    const intervalId = window.setInterval(() => {
      void run();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [boxes]);

  const boxUiStateById = React.useMemo(
    () =>
      Object.fromEntries(boxes.map((box) => [box.id, getBoxUiState(box, fulfilledById)])) as Record<
        string,
        BoxUiState
      >,
    [boxes, fulfilledById]
  );
  const unopened = React.useMemo(
    () => boxes.filter((box) => boxUiStateById[box.id] === 'ready-open'),
    [boxUiStateById, boxes]
  );
  const claimable = React.useMemo(
    () => boxes.filter((box) => boxUiStateById[box.id] === 'ready-claim'),
    [boxUiStateById, boxes]
  );
  const claimed = React.useMemo(
    () => boxes.filter((box) => boxUiStateById[box.id] === 'claimed'),
    [boxUiStateById, boxes]
  );
  const liveSeries = React.useMemo(
    () =>
      new Set(
        boxes.filter((box) => getSeriesState(box.series) === 'live').map((box) => box.series.id)
      ).size,
    [boxes]
  );
  const actionable = React.useMemo(
    () => [...claimable, ...unopened].slice(0, 3),
    [claimable, unopened]
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
                {t('me.kicker')}
              </p>
              {isConnected ? (
                <Badge className="rounded-none border-2 border-background/30 bg-background/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-background">
                  {shortAddr(address)}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="jy-display text-3xl uppercase leading-tight sm:text-4xl xl:text-5xl">
                {t('me.title')}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-background/88 sm:text-base">
                {t('me.desc')}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-background/66">
                {isConnected
                  ? `${t('me.lastActivity')}: ${fmtTime(totals.lastActivityAt, localeTag) ?? t('common.notAvailable')}`
                  : t('me.connectHint')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-background/20 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                  {t('me.metricOwned')}
                </div>
                <div className="mt-2 jy-display text-2xl text-background">
                  {loading ? '--' : boxes.length}
                </div>
                <p className="mt-2 text-sm leading-6 text-background/72">
                  {t('me.metricOwnedHint')}
                </p>
              </div>
              <div className="border border-background/20 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                  {t('me.metricQueue')}
                </div>
                <div className="mt-2 jy-display text-2xl text-background">
                  {loading ? '--' : unopened.length + claimable.length}
                </div>
                <p className="mt-2 text-sm leading-6 text-background/72">
                  {t('me.metricQueueHint')}
                </p>
              </div>
              <div className="border border-background/20 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                  {t('me.metricSeries')}
                </div>
                <div className="mt-2 jy-display text-2xl text-background">
                  {loading ? '--' : liveSeries}
                </div>
                <p className="mt-2 text-sm leading-6 text-background/72">
                  {t('me.metricSeriesHint')}
                </p>
              </div>
            </div>
          </div>

          <div className="border-2 border-background/30 bg-background/10 p-4 backdrop-blur-[2px]">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-accent/90">
              <span>{t('me.signalTitle')}</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="border border-background/20 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                    {t('me.readyOpen')}
                  </div>
                  <div className="mt-2 jy-display text-lg text-background">
                    {loading ? '--' : unopened.length}
                  </div>
                </div>
                <div className="border border-background/20 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                    {t('me.readyClaim')}
                  </div>
                  <div className="mt-2 jy-display text-lg text-background">
                    {loading ? '--' : claimable.length}
                  </div>
                </div>
              </div>
              <div className="border border-background/20 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3 border-b border-background/20 py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                    {t('me.totalPurchased')}
                  </span>
                  <span className="text-right text-sm text-background">
                    {loading ? '--' : totals.totalPurchased}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 border-b border-background/20 py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                    {t('me.totalOpened')}
                  </span>
                  <span className="text-right text-sm text-background">
                    {loading ? '--' : totals.totalOpened}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 border-b border-background/20 py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-background/60">
                    {t('me.totalClaimed')}
                  </span>
                  <span className="text-right text-sm text-background">
                    {loading ? '--' : totals.totalClaimed}
                  </span>
                </div>
              </div>
              {!isConnected ? (
                <Button
                  onClick={() => connect({ connector: injected() })}
                  className="w-full bg-accent text-accent-foreground hover:bg-[color:var(--color-button-hot)]"
                >
                  <Wallet className="h-4 w-4" />
                  {t('nav.connectWallet')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {isConnected ? (
        <>
          <section className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono tracking-[0.3em] text-accent">01</span>
                <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
              </div>
              <div className="space-y-2">
                <h2 className="jy-display text-2xl uppercase text-foreground">
                  {t('me.queueTitle')}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {t('me.queueDesc')}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card
                    key={index}
                    className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
                  >
                    <CardContent className="grid gap-4 p-5">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-11 w-36" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : actionable.length ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {actionable.map((box) => (
                  <QueueCard
                    key={box.id}
                    box={box}
                    resolution={boxUiStateById[box.id]}
                    locale={locale}
                    t={t}
                    localeTag={localeTag}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
                <CardContent className="p-0">
                  <EmptyState
                    icon={<CheckCircle2 className="h-10 w-10 text-accent" />}
                    title={t('me.queueTitle')}
                    description={t('me.queueEmpty')}
                    className="py-16"
                  />
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono tracking-[0.3em] text-accent">02</span>
                <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
              </div>
              <div className="space-y-2">
                <h2 className="jy-display text-2xl uppercase text-foreground">
                  {t('me.rackTitle')}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {t('me.rackDesc')}
                </p>
              </div>
            </div>

            {error ? (
              <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  {t('common.errorPrefix')}: {error}
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all" className="space-y-5">
                <TabsList className="grid h-auto w-full grid-cols-4 rounded-none border-2 border-foreground bg-background p-1">
                  <TabsTrigger
                    className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
                    value="all"
                  >
                    {t('me.filterAll')}
                  </TabsTrigger>
                  <TabsTrigger
                    className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
                    value="unopened"
                  >
                    {t('me.filterUnopened')}
                  </TabsTrigger>
                  <TabsTrigger
                    className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
                    value="opened"
                  >
                    {t('me.filterOpened')}
                  </TabsTrigger>
                  <TabsTrigger
                    className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
                    value="claimed"
                  >
                    {t('me.filterClaimed')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  {loading ? (
                    <BoxesSkeleton />
                  ) : boxes.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {boxes.map((box) => (
                        <BoxRackCard
                          key={box.id}
                          box={box}
                          resolution={boxUiStateById[box.id]}
                          locale={locale}
                          t={t}
                          localeTag={localeTag}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
                      <CardContent className="p-0">
                        <EmptyState
                          icon={<Gift className="h-10 w-10 text-accent" />}
                          title={t('me.rackTitle')}
                          description={t('me.noBoxes')}
                          className="py-16"
                        />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="unopened" className="mt-0">
                  {loading ? (
                    <BoxesSkeleton />
                  ) : unopened.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {unopened.map((box) => (
                        <BoxRackCard
                          key={box.id}
                          box={box}
                          resolution={boxUiStateById[box.id]}
                          locale={locale}
                          t={t}
                          localeTag={localeTag}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
                      <CardContent className="p-0">
                        <EmptyState
                          icon={<Gift className="h-10 w-10 text-accent" />}
                          title={t('me.filterUnopened')}
                          description={t('me.emptyUnopened')}
                          className="py-16"
                        />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="opened" className="mt-0">
                  {loading ? (
                    <BoxesSkeleton />
                  ) : claimable.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {claimable.map((box) => (
                        <BoxRackCard
                          key={box.id}
                          box={box}
                          resolution={boxUiStateById[box.id]}
                          locale={locale}
                          t={t}
                          localeTag={localeTag}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
                      <CardContent className="p-0">
                        <EmptyState
                          icon={<Gift className="h-10 w-10 text-accent" />}
                          title={t('me.filterOpened')}
                          description={t('me.emptyOpened')}
                          className="py-16"
                        />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="claimed" className="mt-0">
                  {loading ? (
                    <BoxesSkeleton />
                  ) : claimed.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {claimed.map((box) => (
                        <BoxRackCard
                          key={box.id}
                          box={box}
                          resolution={boxUiStateById[box.id]}
                          locale={locale}
                          t={t}
                          localeTag={localeTag}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
                      <CardContent className="p-0">
                        <EmptyState
                          icon={<Gift className="h-10 w-10 text-accent" />}
                          title={t('me.filterClaimed')}
                          description={t('me.emptyClaimed')}
                          className="py-16"
                        />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </section>
        </>
      ) : (
        <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="jy-display text-lg uppercase text-foreground">{t('me.connectTitle')}</p>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {t('me.connectDesc')}
              </p>
            </div>
            <Button onClick={() => connect({ connector: injected() })} className="w-full md:w-auto">
              <Wallet className="h-4 w-4" />
              {t('nav.connectWallet')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
