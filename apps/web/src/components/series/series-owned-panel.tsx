'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { injected } from '@wagmi/core';
import {
  useAccount,
  useConnect,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { Loader2, Wallet } from 'lucide-react';

import { erc721MetadataAbi } from '@/abi/erc721Metadata';
import { randomnessProviderAbi } from '@/abi/randomnessProvider';
import { junkyardSeriesAbi } from '@/abi/junkyardSeries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { subgraphRequest } from '@/lib/subgraph';
import { useTxFeedback } from '@/lib/use-tx-feedback';
import { useI18n } from '@/providers/i18n-provider';

type PrizeDistribution = {
  id: string;
  amount: string;
  timestamp: string;
  asset: {
    assetType: 'ERC20' | 'ERC721' | 'ERC1155';
    assetContract: string;
    tokenId?: string | null;
  };
};

type BlindBox = {
  id: string;
  tokenId: string;
  status: 'UNOPENED' | 'OPENED' | 'CLAIMED' | 'BURNED';
  requestId?: string | null;
  purchasedAt: string;
  openedAt?: string | null;
  claimedAt?: string | null;
  prizes: PrizeDistribution[];
  series: { id: string };
};

type UserData = {
  user: {
    id: string;
    blindBoxes: BlindBox[];
  } | null;
};

type BoxUiState = 'ready-open' | 'awaiting-randomness' | 'ready-claim' | 'claimed' | 'burned';

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

async function loadBoxes(address: string, seriesId: string) {
  const data = await subgraphRequest<UserData>(
    `
        query MyBoxes($id: ID!) {
          user(id: $id) {
            id
            blindBoxes(first: 100, orderBy: purchasedAt, orderDirection: desc) {
              id
              tokenId
              status
              requestId
              purchasedAt
              openedAt
              claimedAt
              prizes(orderBy: timestamp, orderDirection: asc) {
                id
                amount
                timestamp
                asset {
                  assetType
                  assetContract
                  tokenId
                }
              }
              series { id }
            }
          }
        }
        `,
    { id: address.toLowerCase() }
  );

  return (data.user?.blindBoxes ?? []).filter((box) => box.series.id === seriesId);
}

function isBytes32(value: string | null | undefined): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x') && value.length === 66;
}

function getBoxUiState(box: BlindBox, fulfilledByBoxId: Map<string, boolean>): BoxUiState {
  if (box.status === 'UNOPENED') return 'ready-open';
  if (box.status === 'OPENED') {
    return fulfilledByBoxId.get(box.id) ? 'ready-claim' : 'awaiting-randomness';
  }
  if (box.status === 'CLAIMED') return 'claimed';
  return 'burned';
}

export default function SeriesOwnedPanel({
  seriesId,
  seriesAddress,
  oracleAddress,
  nftAddress,
  initialBoxId,
  initialAction,
}: {
  seriesId: string;
  seriesAddress: `0x${string}`;
  oracleAddress: `0x${string}`;
  nftAddress: `0x${string}`;
  initialBoxId?: string;
  initialAction?: 'buy' | 'open' | 'claim';
}) {
  const { locale, t } = useI18n();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const publicClient = usePublicClient();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [boxes, setBoxes] = React.useState<BlindBox[]>([]);
  const [selectedBox, setSelectedBox] = React.useState<BlindBox | null>(null);
  const [gasPrice, setGasPrice] = React.useState<bigint | null>(null);
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US';
  const openedBoxes = React.useMemo(
    () => boxes.filter((box) => box.status === 'OPENED' && isBytes32(box.requestId)),
    [boxes]
  );

  const { data: oracleFee } = useReadContract({
    abi: randomnessProviderAbi,
    address: oracleAddress,
    functionName: 'getRequestPrice',
  });
  const { data: estimatedOracleFee } = useReadContract({
    abi: randomnessProviderAbi,
    address: oracleAddress,
    functionName: 'estimateRequestPrice',
    args: gasPrice != null ? [gasPrice] : undefined,
    query: { enabled: gasPrice != null },
  });
  const { data: fulfillmentResults } = useReadContracts({
    contracts: openedBoxes.map((box) => ({
      abi: randomnessProviderAbi,
      address: oracleAddress,
      functionName: 'isFulfilled' as const,
      args: [box.requestId as `0x${string}`],
    })),
    query: {
      enabled: openedBoxes.length > 0,
      staleTime: 0,
      refetchInterval: 8000,
    },
  });
  const { data: ownershipResults } = useReadContracts({
    contracts: boxes.map((box) => ({
      abi: erc721MetadataAbi,
      address: nftAddress,
      functionName: 'ownerOf' as const,
      args: [BigInt(box.tokenId)],
    })),
    query: {
      enabled: boxes.length > 0,
      staleTime: 0,
      refetchInterval: 8000,
    },
  });

  const openTx = useWriteContract();
  const claimTx = useWriteContract();

  const openReceipt = useWaitForTransactionReceipt({
    hash: openTx.data,
    query: { enabled: Boolean(openTx.data) },
  });
  const claimReceipt = useWaitForTransactionReceipt({
    hash: claimTx.data,
    query: { enabled: Boolean(claimTx.data) },
  });

  const refreshBoxes = React.useCallback(async () => {
    if (!address) {
      setBoxes([]);
      return [] as BlindBox[];
    }

    const nextBoxes = await loadBoxes(address, seriesId);
    setBoxes(nextBoxes);
    setSelectedBox((current) =>
      current ? (nextBoxes.find((box) => box.id === current.id) ?? null) : current
    );
    return nextBoxes;
  }, [address, seriesId]);

  const pollBoxesUntil = React.useCallback(
    async (matcher: (nextBoxes: BlindBox[]) => boolean) => {
      if (!address) return;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const nextBoxes = await refreshBoxes();
        if (matcher(nextBoxes)) {
          router.refresh();
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      router.refresh();
    },
    [address, refreshBoxes, router]
  );

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!address) {
        setBoxes([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await refreshBoxes();
        if (cancelled) return;
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
  }, [address, refreshBoxes, t]);

  React.useEffect(() => {
    if (!initialBoxId || !boxes.length || !initialAction || initialAction === 'buy') return;
    const next = boxes.find((box) => box.tokenId === initialBoxId);
    if (!next) return;
    if (initialAction === 'open' && next.status !== 'UNOPENED') return;
    if (initialAction === 'claim' && next.status !== 'OPENED') return;
    setSelectedBox(next);
  }, [boxes, initialAction, initialBoxId]);

  React.useEffect(() => {
    if (!selectedBox) return;
    const nextSelected = boxes.find((box) => box.id === selectedBox.id) ?? null;
    if (
      nextSelected?.status !== selectedBox.status ||
      nextSelected?.requestId !== selectedBox.requestId ||
      nextSelected?.openedAt !== selectedBox.openedAt ||
      nextSelected?.claimedAt !== selectedBox.claimedAt ||
      nextSelected?.prizes.length !== selectedBox.prizes.length
    ) {
      setSelectedBox(nextSelected);
    }
  }, [boxes, selectedBox]);

  const fulfilledByBoxId = React.useMemo(() => {
    const next = new Map<string, boolean>();
    openedBoxes.forEach((box, index) => {
      const result = fulfillmentResults?.[index];
      next.set(box.id, result?.status === 'success' ? Boolean(result.result) : false);
    });
    return next;
  }, [fulfillmentResults, openedBoxes]);
  const ownerExistsByBoxId = React.useMemo(() => {
    const next = new Map<string, boolean>();
    boxes.forEach((box, index) => {
      const result = ownershipResults?.[index];
      next.set(box.id, result?.status === 'success');
    });
    return next;
  }, [boxes, ownershipResults]);
  const boxUiStateById = React.useMemo(() => {
    const next = new Map<string, BoxUiState>();
    boxes.forEach((box) => {
      const ownerExists = ownerExistsByBoxId.get(box.id);
      if (box.status === 'CLAIMED' || (box.status === 'OPENED' && ownerExists === false)) {
        next.set(box.id, 'claimed');
        return;
      }
      next.set(box.id, getBoxUiState(box, fulfilledByBoxId));
    });
    return next;
  }, [boxes, fulfilledByBoxId, ownerExistsByBoxId]);
  const selectedUiState = selectedBox ? getBoxUiState(selectedBox, fulfilledByBoxId) : null;
  const selectedResolvedUiState = selectedBox
    ? (boxUiStateById.get(selectedBox.id) ?? selectedUiState)
    : null;
  const selectedCanOpen = selectedResolvedUiState === 'ready-open';
  const selectedAwaitingRandomness = selectedResolvedUiState === 'awaiting-randomness';
  const selectedCanClaim = selectedResolvedUiState === 'ready-claim';
  const selectedClaimed = selectedResolvedUiState === 'claimed';

  React.useEffect(() => {
    let cancelled = false;

    if (!selectedCanOpen || !publicClient) {
      setGasPrice(null);
      return;
    }

    publicClient
      .getGasPrice()
      .then((value) => {
        if (!cancelled) setGasPrice(value);
      })
      .catch(() => {
        if (!cancelled) setGasPrice(null);
      });

    return () => {
      cancelled = true;
    };
  }, [publicClient, selectedCanOpen, selectedBox?.id]);

  useTxFeedback({
    action: t('series.open'),
    tx: openTx,
    receipt: openReceipt,
    onSuccess: () => {
      React.startTransition(() => {
        const currentBoxId = selectedBox?.id;
        pollBoxesUntil((nextBoxes) => {
          if (!currentBoxId) return true;
          const nextSelected = nextBoxes.find((box) => box.id === currentBoxId);
          return Boolean(nextSelected?.requestId || nextSelected?.status === 'OPENED');
        }).catch(() => {
          router.refresh();
        });
      });
    },
  });

  useTxFeedback({
    action: t('series.claim'),
    tx: claimTx,
    receipt: claimReceipt,
    onSuccess: () => {
      React.startTransition(() => {
        const currentBoxId = selectedBox?.id;
        pollBoxesUntil((nextBoxes) => {
          if (!currentBoxId) return true;
          const nextSelected = nextBoxes.find((box) => box.id === currentBoxId);
          return Boolean(nextSelected?.status === 'CLAIMED' && nextSelected.prizes.length > 0);
        }).catch(() => {
          router.refresh();
        });
      });
    },
  });

  const baseOracleFee =
    oracleFee == null && estimatedOracleFee == null
      ? null
      : oracleFee == null
        ? estimatedOracleFee
        : estimatedOracleFee == null
          ? oracleFee
          : oracleFee > estimatedOracleFee
            ? oracleFee
            : estimatedOracleFee;
  const bufferedOracleFee = baseOracleFee != null ? baseOracleFee + baseOracleFee / 5n + 1n : null;
  const shouldPollClaimSync = React.useMemo(
    () => boxes.some((box) => box.status === 'OPENED' && ownerExistsByBoxId.get(box.id) === false),
    [boxes, ownerExistsByBoxId]
  );

  React.useEffect(() => {
    if (!address || !shouldPollClaimSync) return;

    const intervalId = window.setInterval(() => {
      void refreshBoxes().catch(() => undefined);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [address, refreshBoxes, shouldPollClaimSync]);

  function OwnedBoxesSkeleton() {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden border-4 border-foreground bg-background shadow-[6px_6px_0_0_var(--color-shadow)]"
          >
            <Skeleton className="h-40 rounded-none border-b-4 border-foreground bg-muted/60" />
            <div className="grid gap-3 p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  function getStatusLabel(box: BlindBox) {
    const uiState = boxUiStateById.get(box.id) ?? getBoxUiState(box, fulfilledByBoxId);
    if (uiState === 'awaiting-randomness') return t('actions.awaitingRandomness');
    if (uiState === 'ready-claim') return t('actions.claimReady');
    if (uiState === 'claimed') return t('status.CLAIMED');
    return t(`status.${box.status}`);
  }

  function renderPrizeSummary(prize: PrizeDistribution) {
    if (prize.asset.assetType === 'ERC721') {
      return `#${prize.asset.tokenId ?? '0'}`;
    }
    if (prize.asset.assetType === 'ERC1155') {
      return `#${prize.asset.tokenId ?? '0'} · ${prize.amount}`;
    }
    return prize.amount;
  }

  return (
    <div id="series-owned-panel" className="space-y-5">
      <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
        <CardHeader className="border-b-4 border-foreground bg-muted/35 p-5">
          <CardTitle className="jy-display text-base uppercase">{t('series.boxesTitle')}</CardTitle>
          <CardDescription>{t('series.boxesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          {!isConnected ? (
            <div className="flex flex-col gap-3 border-2 border-border/60 bg-background/75 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-accent/15 text-foreground">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{t('actions.connectPrompt')}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t('actions.connectDesc')}
                  </p>
                </div>
              </div>
              <Button type="button" onClick={() => connect({ connector: injected() })}>
                <Wallet className="h-4 w-4" />
                {t('nav.connectWallet')}
              </Button>
            </div>
          ) : loading ? (
            <OwnedBoxesSkeleton />
          ) : error ? (
            <p className="text-sm text-muted-foreground">
              {t('common.errorPrefix')}: {error}
            </p>
          ) : boxes.length === 0 ? (
            <EmptyState
              className="py-14"
              title={t('series.ownedEmpty')}
              description={t('series.boxesDesc')}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {boxes.map((box) => {
                const actionable =
                  (boxUiStateById.get(box.id) ?? getBoxUiState(box, fulfilledByBoxId)) !== 'burned';
                return (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => actionable && setSelectedBox(box)}
                    className={`group flex h-full min-h-[19rem] w-full flex-col overflow-hidden border-4 border-foreground bg-background text-left shadow-[6px_6px_0_0_var(--color-shadow)] transition-[transform,box-shadow] duration-150 ${
                      actionable
                        ? 'hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--color-shadow)]'
                        : ''
                    }`}
                  >
                    <div className="relative flex h-40 shrink-0 items-center justify-center border-b-4 border-foreground bg-muted/35">
                      <Image
                        src="/logo.png"
                        alt="Blind box cover"
                        width={96}
                        height={96}
                        className="h-24 w-24 object-contain pixelated"
                      />
                      <div className="absolute right-3 top-3">
                        <Badge
                          variant="outline"
                          className="rounded-none border-2 px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
                        >
                          {getStatusLabel(box)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="space-y-1">
                        <p className="jy-display text-base uppercase text-foreground">
                          {t('me.boxTitle')} #{box.tokenId}
                        </p>
                      </div>
                      <div className="mt-auto space-y-2 text-xs text-muted-foreground">
                        <p>
                          {t('me.bought')}: {fmtTime(box.purchasedAt, localeTag) ?? '-'}
                        </p>
                        {box.openedAt ? (
                          <p>
                            {t('me.opened')}: {fmtTime(box.openedAt, localeTag) ?? '-'}
                          </p>
                        ) : null}
                        {box.claimedAt ? (
                          <p>
                            {t('me.claimed')}: {fmtTime(box.claimedAt, localeTag) ?? '-'}
                          </p>
                        ) : null}
                        {(boxUiStateById.get(box.id) ?? getBoxUiState(box, fulfilledByBoxId)) ===
                        'claimed' ? (
                          <p>
                            {t('series.claimedPrizeCount')}: {box.prizes.length}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedBox != null} onOpenChange={(open) => !open && setSelectedBox(null)}>
        <DialogContent className="border-4 border-foreground bg-card p-0 shadow-[10px_10px_0_0_var(--color-shadow)] sm:max-w-xl">
          {selectedBox ? (
            <>
              <DialogHeader className="border-b-4 border-foreground bg-muted/35 p-5">
                <DialogTitle className="jy-display text-lg uppercase">
                  {t('me.boxTitle')} #{selectedBox.tokenId}
                </DialogTitle>
                <DialogDescription>
                  {selectedCanOpen
                    ? t('actions.openDesc')
                    : selectedAwaitingRandomness
                      ? t('actions.waitingDesc')
                      : selectedCanClaim
                        ? t('actions.claimDesc')
                        : t(`status.${selectedBox.status}`)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 p-5">
                <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="flex min-h-40 items-center justify-center border-2 border-foreground bg-muted/35">
                    <Image
                      src="/logo.png"
                      alt="Blind box cover"
                      width={96}
                      height={96}
                      className="h-24 w-24 object-contain pixelated"
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="space-y-2 text-sm text-foreground">
                      {selectedBox.openedAt ? (
                        <p>
                          {t('me.opened')}:{' '}
                          <span className="font-mono">
                            {fmtTime(selectedBox.openedAt, localeTag) ?? '-'}
                          </span>
                        </p>
                      ) : null}
                      {selectedBox.claimedAt ? (
                        <p>
                          {t('me.claimed')}:{' '}
                          <span className="font-mono">
                            {fmtTime(selectedBox.claimedAt, localeTag) ?? '-'}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {selectedAwaitingRandomness ? (
                  <div className="border-2 border-border/60 bg-background/75 p-4 text-sm leading-6 text-muted-foreground">
                    {t('actions.waitingDesc')}
                  </div>
                ) : null}

                {selectedCanOpen ? (
                  <Button
                    className="w-full"
                    disabled={openTx.isPending || bufferedOracleFee == null}
                    onClick={() =>
                      openTx.writeContract({
                        abi: junkyardSeriesAbi,
                        address: seriesAddress,
                        functionName: 'open',
                        args: [BigInt(selectedBox.tokenId)],
                        value: bufferedOracleFee ?? 0n,
                      })
                    }
                  >
                    {openTx.isPending ? <Loader2 className="animate-spin" /> : t('series.open')}
                  </Button>
                ) : null}

                {selectedCanClaim ? (
                  <Button
                    className="w-full"
                    disabled={claimTx.isPending}
                    onClick={() =>
                      claimTx.writeContract({
                        abi: junkyardSeriesAbi,
                        address: seriesAddress,
                        functionName: 'claim',
                        args: [BigInt(selectedBox.tokenId)],
                      })
                    }
                  >
                    {claimTx.isPending ? <Loader2 className="animate-spin" /> : t('series.claim')}
                  </Button>
                ) : null}

                {selectedClaimed ? (
                  <div className="grid gap-3 border-t-2 border-border/60 pt-4">
                    <div className="space-y-1">
                      <p className="jy-display text-sm uppercase text-foreground">
                        {t('series.claimedRewardsTitle')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('series.claimedRewardsDesc')}
                      </p>
                    </div>
                    {selectedBox.prizes.length ? (
                      <div className="grid gap-3">
                        {selectedBox.prizes.map((prize) => (
                          <div
                            key={prize.id}
                            className="flex items-start justify-between gap-3 border-2 border-border/60 bg-background/75 p-3"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {prize.asset.assetType}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {shortAddr(prize.asset.assetContract)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm text-foreground">
                                {renderPrizeSummary(prize)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {fmtTime(prize.timestamp, localeTag) ?? '-'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <Skeleton className="h-16 w-full border-2 border-border/60 bg-muted/40" />
                        <Skeleton className="h-16 w-full border-2 border-border/60 bg-muted/40" />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
