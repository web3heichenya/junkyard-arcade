'use client';

import * as React from 'react';
import { useRouter } from '@bprogress/next/app';
import { parseEther } from 'viem';
import { decodeEventLog } from 'viem';
import { injected } from '@wagmi/core';
import {
  useAccount,
  useChainId,
  useConnect,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Info,
  RadioTower,
  Shield,
} from 'lucide-react';

import { junkyardFactoryAbi } from '@/abi/junkyardFactory';
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
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/providers/i18n-provider';

const ZERO = '0x0000000000000000000000000000000000000000' as const;
const BASE_SEPOLIA_FACTORY = '0x4E0b1240D3350f34dfC3bbA114076A87C25Dd0aD' as const;
const BASE_SEPOLIA_ORACLE = '0xf2AE2a6EBF256B06CF0693fc29519A890C476618' as const;
const BASE_SEPOLIA_CONFIG_GUARD = '0x755D04e936CaCFDE68bA5CF22c397a49Ff3D9451' as const;
const BASE_SEPOLIA_BUY_GUARD = '0xCB61Dc7CfED0B85F4D540e8e882FcfDd067e8574' as const;

type AddressOption = {
  value: `0x${string}`;
  label: string;
};

function toBigIntOrNull(value: string) {
  if (!value.trim()) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function toPriceWeiOrNull(value: string) {
  if (!value.trim()) return null;
  try {
    return parseEther(value);
  } catch {
    return null;
  }
}

function toUnixTimestamp(value?: Date) {
  if (!value) return null;
  return BigInt(Math.floor(value.getTime() / 1000));
}

function shortenAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function explorerBase() {
  return baseSepolia.blockExplorers.default.url;
}

function formatDateTime(value: Date | undefined, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function FieldBlock({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Label
          htmlFor={htmlFor}
          className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
        >
          {label}
        </Label>
        {hint ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  aria-label={label}
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SectionBlock({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-2 border-foreground/80 bg-card/90 p-4 shadow-[6px_6px_0_0_var(--color-shadow)] sm:p-5">
      <div className="flex items-start gap-3 border-b-2 border-border/60 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-accent/20 text-foreground">
          {icon}
        </div>
        <div className="space-y-1">
          <h2 className="jy-display text-sm uppercase text-foreground sm:text-base">{title}</h2>
          <p className="text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function PreviewRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-3 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span
        className={
          mono
            ? 'text-right font-mono text-sm text-foreground'
            : 'text-right text-sm text-foreground'
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function CreateSeriesForm() {
  const { locale, t } = useI18n();
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const chainId = useChainId();
  const router = useRouter();
  const tx = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: tx.data,
    query: {
      enabled: Boolean(tx.data),
    },
  });

  const paymentOptions: AddressOption[] = [
    {
      value: ZERO,
      label: t('create.paymentNativeOption'),
    },
  ];
  const configGuardOptions: AddressOption[] = [
    {
      value: ZERO,
      label: t('create.guardNoneOption'),
    },
    {
      value: BASE_SEPOLIA_CONFIG_GUARD,
      label: t('create.configGuardOwnerOption'),
    },
  ];
  const buyGuardOptions: AddressOption[] = [
    {
      value: ZERO,
      label: t('create.guardNoneOption'),
    },
    {
      value: BASE_SEPOLIA_BUY_GUARD,
      label: t('create.buyGuardOpenOption'),
    },
  ];
  const oracleOptions: AddressOption[] = [
    {
      value: BASE_SEPOLIA_ORACLE,
      label: t('create.oracleDefaultOption'),
    },
  ];

  const [name, setName] = React.useState('Junkyard Box');
  const [symbol, setSymbol] = React.useState('JBOX');
  const [priceEther, setPriceEther] = React.useState('0.1');
  const [maxSupply, setMaxSupply] = React.useState('100');
  const [maxAssetTypesPerOpening, setMaxAssetTypesPerOpening] = React.useState('5');
  const [startDate, setStartDate] = React.useState<Date | undefined>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10, 0, 0);
    return now;
  });
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [paymentToken, setPaymentToken] = React.useState<`0x${string}`>(ZERO);
  const [configGuard, setConfigGuard] = React.useState<`0x${string}`>(BASE_SEPOLIA_CONFIG_GUARD);
  const [buyGuard, setBuyGuard] = React.useState<`0x${string}`>(BASE_SEPOLIA_BUY_GUARD);
  const [oracle, setOracle] = React.useState<`0x${string}`>(BASE_SEPOLIA_ORACLE);

  const priceWei = toPriceWeiOrNull(priceEther);
  const maxSupplyBI = toBigIntOrNull(maxSupply);
  const maxAssetTypesPerOpeningBI = toBigIntOrNull(maxAssetTypesPerOpening);
  const startTimeBI = toUnixTimestamp(startDate);
  const endTimeBI = endDate ? (toUnixTimestamp(endDate) ?? 0n) : 0n;
  const onSupportedChain = chainId === baseSepolia.id;

  const identityReady = name.trim().length > 0 && symbol.trim().length > 0;
  const saleReady =
    priceWei != null &&
    maxSupplyBI != null &&
    maxSupplyBI > 0n &&
    maxAssetTypesPerOpeningBI != null &&
    maxAssetTypesPerOpeningBI > 0n &&
    maxAssetTypesPerOpeningBI <= 255n &&
    startTimeBI != null;
  const securityReady = Boolean(paymentToken && configGuard && buyGuard && oracle);
  const readySections = [identityReady, saleReady, securityReady].filter(Boolean).length;
  const valid = identityReady && saleReady && securityReady && onSupportedChain;

  const paymentLabel =
    paymentOptions.find((option) => option.value === paymentToken)?.label ??
    t('common.notAvailable');
  const configGuardLabel =
    configGuardOptions.find((option) => option.value === configGuard)?.label ??
    t('common.notAvailable');
  const buyGuardLabel =
    buyGuardOptions.find((option) => option.value === buyGuard)?.label ?? t('common.notAvailable');
  const oracleLabel =
    oracleOptions.find((option) => option.value === oracle)?.label ?? t('common.notAvailable');

  const err = tx.error instanceof Error ? tx.error.message : null;
  const toastIdRef = React.useRef<string | number | null>(null);
  const redirectedRef = React.useRef(false);

  React.useEffect(() => {
    if (!tx.isPending) return;
    toastIdRef.current = toast.loading(t('create.toastExecuting'));
  }, [t, tx.isPending]);

  React.useEffect(() => {
    if (!tx.data) return;
    if (receipt.isSuccess || receipt.isError) return;

    if (toastIdRef.current != null) {
      toast.message(t('create.toastSent'), {
        id: toastIdRef.current,
        description: shortenAddress(tx.data),
      });
      return;
    }

    toastIdRef.current = toast.message(t('create.toastSent'), {
      description: shortenAddress(tx.data),
    });
  }, [receipt.isError, receipt.isSuccess, t, tx.data]);

  React.useEffect(() => {
    if (!err) return;

    toast.error(t('create.toastFailed'), {
      id: toastIdRef.current ?? undefined,
      description: err,
    });
    toastIdRef.current = null;
  }, [err, t]);

  React.useEffect(() => {
    if (!receipt.error) return;

    const message =
      receipt.error instanceof Error ? receipt.error.message : t('common.unknownError');
    toast.error(t('create.toastFailed'), {
      id: toastIdRef.current ?? undefined,
      description: message,
    });
    toastIdRef.current = null;
  }, [receipt.error, t]);

  React.useEffect(() => {
    if (!receipt.data || redirectedRef.current) return;

    let seriesId: string | null = null;
    for (const log of receipt.data.logs) {
      try {
        const decoded = decodeEventLog({
          abi: junkyardFactoryAbi,
          data: log.data,
          topics: log.topics,
          eventName: 'SeriesCreated',
        });
        seriesId = decoded.args.seriesId.toString();
        break;
      } catch {
        continue;
      }
    }

    toast.success(t('create.toastSuccess'), {
      id: toastIdRef.current ?? undefined,
      description: seriesId != null ? `#${seriesId}` : undefined,
    });
    toastIdRef.current = null;

    if (!seriesId) return;

    redirectedRef.current = true;
    router.push(`/${locale}/series/${seriesId}`);
  }, [locale, receipt.data, router, t]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !isConnected ||
      !valid ||
      tx.isPending ||
      priceWei == null ||
      maxSupplyBI == null ||
      startTimeBI == null
    ) {
      return;
    }

    tx.writeContract({
      abi: junkyardFactoryAbi,
      address: BASE_SEPOLIA_FACTORY,
      functionName: 'createSeries',
      args: [
        name,
        symbol,
        priceWei,
        paymentToken,
        maxSupplyBI,
        startTimeBI,
        endTimeBI,
        configGuard,
        buyGuard,
        oracle,
        Number(maxAssetTypesPerOpeningBI ?? 0n),
      ],
    });
  }

  function handlePrimaryAction() {
    if (!isConnected) {
      connect({ connector: injected() });
      return;
    }
  }

  const fieldClassName =
    'h-10 rounded-none border-2 border-foreground/80 bg-background px-3 text-sm text-foreground shadow-[4px_4px_0_0_var(--color-shadow)] placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0';

  return (
    <section
      id="create-form"
      className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,360px)]"
    >
      <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
        <CardHeader className="gap-4 border-b-4 border-foreground bg-muted/35 p-5 sm:p-6">
          <div>
            <CardTitle className="jy-display text-lg uppercase sm:text-xl">
              {t('create.formTitle')}
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
              {t('create.formDesc')}
            </CardDescription>
          </div>
          <div className="border-2 border-border/60 bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>{t('create.completionLabel')}</span>
              <span>{readySections}/3</span>
            </div>
            <div className="h-3 border border-foreground bg-muted">
              <div
                className="h-full bg-accent transition-[width] duration-150 ease-out"
                style={{ width: `${(readySections / 3) * 100}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <SectionBlock
              icon={<Boxes className="h-4 w-4" />}
              title={t('create.sectionIdentity')}
              description={t('create.sectionIdentityDesc')}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock htmlFor="name" label={t('create.name')}>
                  <Input
                    id="name"
                    className={fieldClassName}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </FieldBlock>
                <FieldBlock htmlFor="symbol" label={t('create.symbol')}>
                  <Input
                    id="symbol"
                    className={fieldClassName}
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                  />
                </FieldBlock>
              </div>
            </SectionBlock>

            <SectionBlock
              icon={<RadioTower className="h-4 w-4" />}
              title={t('create.sectionSale')}
              description={t('create.sectionSaleDesc')}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock htmlFor="priceEther" label={t('create.priceEther')}>
                  <Input
                    id="priceEther"
                    type="number"
                    min="0"
                    step="0.0001"
                    className={fieldClassName}
                    value={priceEther}
                    onChange={(event) => setPriceEther(event.target.value)}
                  />
                </FieldBlock>
                <FieldBlock htmlFor="maxSupply" label={t('create.maxSupply')}>
                  <Input
                    id="maxSupply"
                    type="number"
                    min="1"
                    step="1"
                    className={fieldClassName}
                    value={maxSupply}
                    onChange={(event) => setMaxSupply(event.target.value)}
                  />
                </FieldBlock>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock
                  htmlFor="maxAssetTypesPerOpening"
                  label={t('create.maxAssetTypesPerOpening')}
                  hint={t('create.maxAssetTypesPerOpeningHint')}
                >
                  <Input
                    id="maxAssetTypesPerOpening"
                    type="number"
                    min="1"
                    max="255"
                    step="1"
                    className={fieldClassName}
                    value={maxAssetTypesPerOpening}
                    onChange={(event) => setMaxAssetTypesPerOpening(event.target.value)}
                  />
                </FieldBlock>
                <FieldBlock htmlFor="paymentToken" label={t('create.paymentToken')}>
                  <Select
                    value={paymentToken}
                    onValueChange={(value) => setPaymentToken(value as `0x${string}`)}
                  >
                    <SelectTrigger id="paymentToken" className="h-10">
                      <SelectValue placeholder={t('create.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock htmlFor="startDate" label={t('create.startTime')}>
                  <DateTimePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder={t('create.pickStartDate')}
                    className="h-10"
                  />
                </FieldBlock>
                <FieldBlock
                  htmlFor="endDate"
                  label={t('create.endTime')}
                  hint={t('create.endTimeHint')}
                >
                  <DateTimePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder={t('create.pickEndDate')}
                    allowClear
                    className="h-10"
                  />
                </FieldBlock>
              </div>
            </SectionBlock>

            <SectionBlock
              icon={<Shield className="h-4 w-4" />}
              title={t('create.sectionSecurity')}
              description={t('create.sectionSecurityDesc')}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock htmlFor="configGuard" label={t('create.configGuard')}>
                  <Select
                    value={configGuard}
                    onValueChange={(value) => setConfigGuard(value as `0x${string}`)}
                  >
                    <SelectTrigger id="configGuard" className="h-10">
                      <SelectValue placeholder={t('create.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {configGuardOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>

                <FieldBlock htmlFor="buyGuard" label={t('create.buyGuard')}>
                  <Select
                    value={buyGuard}
                    onValueChange={(value) => setBuyGuard(value as `0x${string}`)}
                  >
                    <SelectTrigger id="buyGuard" className="h-10">
                      <SelectValue placeholder={t('create.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {buyGuardOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>
              </div>

              <FieldBlock htmlFor="oracle" label={t('create.oracle')}>
                <Select value={oracle} onValueChange={(value) => setOracle(value as `0x${string}`)}>
                  <SelectTrigger id="oracle" className="h-10">
                    <SelectValue placeholder={t('create.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {oracleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldBlock>
            </SectionBlock>

            <div className="flex justify-end">
              <Button
                type="submit"
                onClick={handlePrimaryAction}
                disabled={isConnected ? !valid || tx.isPending : false}
                className="min-w-40"
              >
                <ArrowRight className="h-4 w-4" />
                {!isConnected
                  ? t('nav.connectWallet')
                  : tx.isPending
                    ? t('common.loading')
                    : t('create.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:sticky lg:top-24 lg:self-start">
        <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
          <CardHeader className="border-b-4 border-foreground bg-muted/35">
            <CardTitle className="jy-display text-base uppercase">
              {t('create.previewTitle')}
            </CardTitle>
            <CardDescription>{t('create.previewDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <PreviewRow
              label={t('create.previewCollection')}
              value={`${name || 'Untitled'} / ${symbol || '--'}`}
            />
            <PreviewRow label={t('create.previewNetwork')} value={t('create.fixedNetwork')} />
            <PreviewRow
              label={t('create.previewFactory')}
              value={shortenAddress(BASE_SEPOLIA_FACTORY)}
              mono
            />
            <PreviewRow label={t('create.previewPayment')} value={paymentLabel} />
            <PreviewRow
              label={t('create.previewWindow')}
              value={`${formatDateTime(startDate, t('common.notAvailable'))} -> ${formatDateTime(endDate, t('create.unlimitedLabel'))}`}
            />
            <PreviewRow
              label={t('create.previewGuards')}
              value={`${configGuardLabel} / ${buyGuardLabel}`}
            />
            <PreviewRow label={t('create.previewOracle')} value={oracleLabel} />
          </CardContent>
        </Card>

        <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
          <CardHeader className="border-b-4 border-foreground bg-muted/35">
            <CardTitle className="jy-display text-base uppercase">
              {t('create.checklistTitle')}
            </CardTitle>
            <CardDescription>{t('create.checklistDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 text-sm leading-6">
            {[t('create.check1'), t('create.check2'), t('create.check3')].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 border-2 border-border/60 bg-background/75 p-3"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-foreground bg-accent/20 text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <p>{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
          <CardHeader className="border-b-4 border-foreground bg-muted/35">
            <CardTitle className="jy-display text-base uppercase">
              {t('create.quickStatusTitle')}
            </CardTitle>
            <CardDescription>{t('create.quickStatusDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {[
              {
                label: t('create.statusNetwork'),
                ok: onSupportedChain,
                value: onSupportedChain ? t('create.statusOk') : t('create.switchNetwork'),
                icon: <RadioTower className="h-4 w-4" />,
              },
              {
                label: t('create.statusConfig'),
                ok: readySections === 3,
                value: readySections === 3 ? t('create.statusOk') : t('create.statusMissing'),
                icon: <Shield className="h-4 w-4" />,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-2 border-border/60 bg-background/75 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center border border-foreground bg-muted/50 text-foreground">
                    {item.icon}
                  </div>
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span
                  className={`border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    item.ok
                      ? 'border-foreground bg-accent text-accent-foreground'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {tx.data ? (
          <Button asChild variant="outline" className="w-full justify-center">
            <a
              href={`${explorerBase()}/tx/${tx.data}`}
              target="_blank"
              rel="noreferrer"
              aria-label={t('actions.viewOnExplorer')}
            >
              <ExternalLink className="h-4 w-4" />
              {t('actions.viewOnExplorer')}
            </a>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
