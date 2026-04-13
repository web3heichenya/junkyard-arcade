'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { formatEther, parseEther } from 'viem';
import { Wallet } from 'lucide-react';
import { injected } from '@wagmi/core';
import {
  useAccount,
  useConnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';

import { junkyardSeriesAbi } from '@/abi/junkyardSeries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTxFeedback } from '@/lib/use-tx-feedback';
import { useI18n } from '@/providers/i18n-provider';

const ZERO = '0x0000000000000000000000000000000000000000' as const;

type Mode = 0 | 1 | 2;

function safeBigInt(v: string): bigint | null {
  try {
    if (!v.length) return 0n;
    return BigInt(v);
  } catch {
    return null;
  }
}

function safeEther(v: string): bigint | null {
  try {
    if (!v.trim().length) return null;
    return parseEther(v);
  } catch {
    return null;
  }
}

function isHexAddress(a: string): a is `0x${string}` {
  return typeof a === 'string' && a.startsWith('0x') && a.length === 42;
}

function unixToDate(ts: string) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n * 1000);
}

function toUnixTimestamp(value?: Date) {
  if (!value) return null;
  return BigInt(Math.floor(value.getTime() / 1000));
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-border/60 bg-background/75 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

function FieldBlock({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function SeriesAdmin({
  seriesAddress,
  price,
  startTime,
  endTime,
  maxSupply,
  totalPurchased,
  totalClaimed,
}: {
  seriesAddress: `0x${string}`;
  price: string;
  startTime: string;
  endTime: string;
  maxSupply: string;
  totalPurchased: string;
  totalClaimed: string;
}) {
  const { t } = useI18n();
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const router = useRouter();

  const [salePrice, setSalePrice] = React.useState(() => {
    try {
      return formatEther(BigInt(price));
    } catch {
      return price;
    }
  });
  const [saleStart, setSaleStart] = React.useState<Date | undefined>(() => unixToDate(startTime));
  const [saleEnd, setSaleEnd] = React.useState<Date | undefined>(() => unixToDate(endTime));
  const [saleMax, setSaleMax] = React.useState(maxSupply);

  React.useEffect(() => {
    try {
      setSalePrice(formatEther(BigInt(price)));
    } catch {
      setSalePrice(price);
    }
  }, [price]);
  React.useEffect(() => setSaleStart(unixToDate(startTime)), [startTime]);
  React.useEffect(() => setSaleEnd(unixToDate(endTime)), [endTime]);
  React.useEffect(() => setSaleMax(maxSupply), [maxSupply]);

  const locked = useReadContract({
    abi: junkyardSeriesAbi,
    address: seriesAddress,
    functionName: 'isConfigLocked',
  });

  const leftover = useReadContract({
    abi: junkyardSeriesAbi,
    address: seriesAddress,
    functionName: 'getLeftoverPolicy',
  });

  const [mode, setMode] = React.useState<Mode>(0);
  const [recipient, setRecipient] = React.useState<string>(ZERO);

  React.useEffect(() => {
    const value = leftover.data;
    if (!value) return;
    const nextMode = Number(value[0]) as Mode;
    const nextRecipient = value[1] as string;
    if (nextMode === 0 || nextMode === 1 || nextMode === 2) setMode(nextMode);
    if (isHexAddress(nextRecipient)) setRecipient(nextRecipient);
  }, [leftover.data]);

  const updateSaleTx = useWriteContract();
  const setPolicyTx = useWriteContract();
  const sweepTx = useWriteContract();
  const updateSaleReceipt = useWaitForTransactionReceipt({
    hash: updateSaleTx.data,
    query: { enabled: Boolean(updateSaleTx.data) },
  });
  const setPolicyReceipt = useWaitForTransactionReceipt({
    hash: setPolicyTx.data,
    query: { enabled: Boolean(setPolicyTx.data) },
  });
  const sweepReceipt = useWaitForTransactionReceipt({
    hash: sweepTx.data,
    query: { enabled: Boolean(sweepTx.data) },
  });

  const purchased = safeBigInt(totalPurchased) ?? 0n;
  const claimed = safeBigInt(totalClaimed) ?? 0n;
  const end = safeBigInt(endTime) ?? 0n;
  const max = safeBigInt(maxSupply) ?? 0n;
  const endedByTime = end !== 0n && BigInt(Math.floor(Date.now() / 1000)) > end;
  const soldOut = purchased >= max && max !== 0n;

  const currentPolicy = (() => {
    const value = leftover.data;
    if (!value) return null;
    const nextMode = Number(value[0]);
    const nextRecipient = value[1] as string;
    const label =
      nextMode === 0
        ? t('admin.leftoverReturn')
        : nextMode === 1
          ? t('admin.leftoverDonate')
          : t('admin.leftoverBurn');
    return { label, recipient: nextRecipient };
  })();

  const salePriceWei = safeEther(salePrice);
  const saleMaxBI = safeBigInt(saleMax);
  const saleStartTs = toUnixTimestamp(saleStart);
  const saleEndTs = saleEnd ? (toUnixTimestamp(saleEnd) ?? 0n) : 0n;
  const saleValid =
    salePriceWei != null && saleMaxBI != null && saleMaxBI > 0n && saleStartTs != null;

  const fieldClassName =
    'h-10 rounded-none border-2 border-foreground/80 bg-background px-3 text-sm text-foreground shadow-[4px_4px_0_0_var(--color-shadow)] placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0';

  useTxFeedback({
    action: t('admin.updateSale'),
    tx: updateSaleTx,
    receipt: updateSaleReceipt,
    onSuccess: () => {
      locked.refetch();
      leftover.refetch();
      router.refresh();
    },
  });

  useTxFeedback({
    action: t('admin.setPolicy'),
    tx: setPolicyTx,
    receipt: setPolicyReceipt,
    onSuccess: () => {
      leftover.refetch();
      router.refresh();
    },
  });

  useTxFeedback({
    action: t('admin.sweep'),
    tx: sweepTx,
    receipt: sweepReceipt,
    onSuccess: () => {
      locked.refetch();
      leftover.refetch();
      router.refresh();
    },
  });

  return (
    <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
      <CardHeader className="gap-4 border-b-4 border-foreground bg-muted/35 p-5">
        <div className="space-y-2">
          <CardTitle className="jy-display text-base uppercase">{t('admin.title')}</CardTitle>
          <CardDescription>{t('admin.panelDesc')}</CardDescription>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatChip
            label={t('admin.locked')}
            value={locked.data ? t('admin.lockedYes') : t('admin.lockedNo')}
          />
          <StatChip
            label={t('admin.ended')}
            value={endedByTime || soldOut ? t('admin.endedYes') : t('admin.endedNo')}
          />
          <StatChip label={t('admin.claimedShort')} value={`${totalClaimed}/${totalPurchased}`} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {!isConnected ? (
          <div className="flex flex-col gap-3 border-2 border-border/60 bg-background/75 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-accent/15 text-foreground">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-foreground">{t('admin.connectPromptTitle')}</p>
                <p className="text-xs leading-5 text-muted-foreground">{t('admin.connectTip')}</p>
              </div>
            </div>
            <Button type="button" onClick={() => connect({ connector: injected() })}>
              <Wallet className="h-4 w-4" />
              {t('nav.connectWallet')}
            </Button>
          </div>
        ) : null}

        <Tabs defaultValue="sale">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-2 border-foreground bg-background p-1">
            <TabsTrigger
              className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
              value="sale"
            >
              {t('admin.saleTab')}
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
              value="leftovers"
            >
              {t('admin.leftoversTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sale" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock htmlFor="salePrice" label={t('admin.salePriceWei')}>
                <Input
                  id="salePrice"
                  type="number"
                  min="0"
                  step="0.0001"
                  className={fieldClassName}
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </FieldBlock>
              <FieldBlock htmlFor="saleMax" label={t('admin.saleMax')}>
                <Input
                  id="saleMax"
                  type="number"
                  min="1"
                  step="1"
                  className={fieldClassName}
                  value={saleMax}
                  onChange={(e) => setSaleMax(e.target.value)}
                />
              </FieldBlock>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock htmlFor="saleStart" label={t('admin.saleStart')}>
                <DateTimePicker
                  value={saleStart}
                  onChange={setSaleStart}
                  placeholder={t('create.pickStartDate')}
                  className="h-10"
                />
              </FieldBlock>
              <FieldBlock htmlFor="saleEnd" label={t('admin.saleEnd')}>
                <DateTimePicker
                  value={saleEnd}
                  onChange={setSaleEnd}
                  placeholder={t('create.pickEndDate')}
                  allowClear
                  className="h-10"
                />
              </FieldBlock>
            </div>

            <div className="flex justify-end">
              <Button
                size="action"
                disabled={updateSaleTx.isPending || !saleValid}
                onClick={() => {
                  if (salePriceWei == null || saleStartTs == null || saleMaxBI == null) return;
                  updateSaleTx.writeContract({
                    abi: junkyardSeriesAbi,
                    address: seriesAddress,
                    functionName: 'updateSaleConfig',
                    args: [salePriceWei, saleStartTs, saleEndTs, saleMaxBI],
                  });
                }}
              >
                {updateSaleTx.isPending ? t('common.loading') : t('admin.updateSale')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="leftovers" className="space-y-3">
            <div className="border-2 border-border/60 bg-background/75 p-4 text-sm text-foreground">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {t('admin.currentPolicy')}
              </p>
              <p className="mt-2">{currentPolicy ? currentPolicy.label : t('common.loading')}</p>
              {currentPolicy ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {currentPolicy.recipient}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4">
              <FieldBlock htmlFor="leftoverMode" label={t('admin.mode')}>
                <Select
                  value={String(mode)}
                  onValueChange={(value) => setMode(Number(value) as Mode)}
                >
                  <SelectTrigger
                    id="leftoverMode"
                    className="h-10 rounded-none border-2 border-foreground/80"
                  >
                    <SelectValue placeholder={t('admin.changeMode')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('admin.leftoverReturn')}</SelectItem>
                    <SelectItem value="1">{t('admin.leftoverDonate')}</SelectItem>
                    <SelectItem value="2">{t('admin.leftoverBurn')}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldBlock>

              <FieldBlock htmlFor="leftoverRecipient" label={t('admin.recipient')}>
                <Input
                  id="leftoverRecipient"
                  className={`${fieldClassName} font-mono text-xs`}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={ZERO}
                />
              </FieldBlock>
            </div>

            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="action"
                disabled={setPolicyTx.isPending || !isHexAddress(recipient)}
                onClick={() =>
                  setPolicyTx.writeContract({
                    abi: junkyardSeriesAbi,
                    address: seriesAddress,
                    functionName: 'setLeftoverPolicy',
                    args: [mode, recipient as `0x${string}`],
                  })
                }
              >
                {setPolicyTx.isPending ? t('common.loading') : t('admin.setPolicy')}
              </Button>
            </div>

            <Separator />

            <div className="space-y-3 border-2 border-border/60 bg-background/75 p-4">
              <p className="text-xs leading-5 text-muted-foreground">{t('admin.sweepHint')}</p>
              <div className="flex justify-end">
                <Button
                  size="action"
                  disabled={
                    sweepTx.isPending || claimed !== purchased || (!endedByTime && !soldOut)
                  }
                  onClick={() =>
                    sweepTx.writeContract({
                      abi: junkyardSeriesAbi,
                      address: seriesAddress,
                      functionName: 'sweepLeftovers',
                    })
                  }
                >
                  {sweepTx.isPending ? t('common.loading') : t('admin.sweep')}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
