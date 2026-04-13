'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Wallet } from 'lucide-react';
import { injected } from '@wagmi/core';
import {
  useAccount,
  useConnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';

import { erc20Abi } from '@/abi/erc20';
import { erc721Abi } from '@/abi/erc721';
import { erc1155Abi } from '@/abi/erc1155';
import { junkyardPrizePoolAbi } from '@/abi/junkyardPrizePool';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useTxFeedback } from '@/lib/use-tx-feedback';
import { useI18n } from '@/providers/i18n-provider';

type AssetMode = 'erc20' | 'erc721' | 'erc1155';

function isHexAddress(v: string): v is `0x${string}` {
  return v.startsWith('0x') && v.length === 42;
}

function toBigIntOrNull(v: string): bigint | null {
  try {
    if (!v.trim().length) return null;
    return BigInt(v);
  } catch {
    return null;
  }
}

function toBpsFromPercent(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  return Math.round(n * 100);
}

function ActionRow({
  title,
  button,
  children,
}: {
  title: string;
  button: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-2 border-border/60 bg-background/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-foreground">{title}</p>
        {button}
      </div>
      {children}
    </div>
  );
}

export default function SeriesFunding({ prizePoolAddress }: { prizePoolAddress: `0x${string}` }) {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const router = useRouter();

  const [assetMode, setAssetMode] = React.useState<AssetMode>('erc20');
  const [token, setToken] = React.useState('');
  const [amount, setAmount] = React.useState('0');
  const [tokenId, setTokenId] = React.useState('1');
  const [maxSharePercent, setMaxSharePercent] = React.useState('10');
  const [approvedKeys, setApprovedKeys] = React.useState<Record<string, true>>({});

  const validToken = isHexAddress(token);
  const amountBI = toBigIntOrNull(amount);
  const tokenIdBI = toBigIntOrNull(tokenId);
  const validAmount = amountBI != null && amountBI > 0n;
  const validTokenId = tokenIdBI != null && tokenIdBI >= 0n;
  const maxShareBps = assetMode === 'erc721' ? 10_000 : toBpsFromPercent(maxSharePercent);
  const validMaxShare = assetMode === 'erc721' ? true : maxShareBps != null;
  const normalizedToken = validToken ? token.toLowerCase() : '';
  const approvalKey = React.useMemo(
    () =>
      [
        assetMode,
        address?.toLowerCase() ?? '',
        normalizedToken,
        assetMode === 'erc721' ? String(tokenIdBI ?? '') : '',
      ].join(':'),
    [address, assetMode, normalizedToken, tokenIdBI]
  );

  const allowance = useReadContract({
    abi: erc20Abi,
    address: assetMode === 'erc20' && validToken ? token : undefined,
    functionName: 'allowance',
    args: address && validToken ? [address, prizePoolAddress] : undefined,
    query: { enabled: !!address && validToken && assetMode === 'erc20', staleTime: 0 },
  });

  const erc721Approved = useReadContract({
    abi: erc721Abi,
    address: assetMode === 'erc721' && validToken ? token : undefined,
    functionName: 'getApproved',
    args: validTokenId ? [tokenIdBI ?? 0n] : undefined,
    query: { enabled: validToken && validTokenId && assetMode === 'erc721', staleTime: 0 },
  });

  const erc1155Approved = useReadContract({
    abi: erc1155Abi,
    address: assetMode === 'erc1155' && validToken ? token : undefined,
    functionName: 'isApprovedForAll',
    args: address && validToken ? [address, prizePoolAddress] : undefined,
    query: { enabled: !!address && validToken && assetMode === 'erc1155', staleTime: 0 },
  });
  const whitelistStatus = useReadContract({
    abi: junkyardPrizePoolAbi,
    address: validToken ? prizePoolAddress : undefined,
    functionName: 'isAssetWhitelisted',
    args: validToken ? [token as `0x${string}`] : undefined,
    query: { enabled: validToken, staleTime: 0 },
  });

  const chainNeedsERC20Approval =
    assetMode === 'erc20' && validToken && validAmount
      ? (allowance.data ?? 0n) < (amountBI ?? 0n)
      : false;
  const chainNeedsERC721Approval =
    assetMode === 'erc721' && validToken && validTokenId
      ? (erc721Approved.data ?? '0x')?.toLowerCase() !== prizePoolAddress.toLowerCase()
      : false;
  const chainNeedsERC1155Approval =
    assetMode === 'erc1155' && validToken ? !(erc1155Approved.data ?? false) : false;
  const hasApprovedOverride = approvedKeys[approvalKey] === true;
  const needsERC20Approval = assetMode === 'erc20' ? chainNeedsERC20Approval : false;
  const needsERC721Approval =
    assetMode === 'erc721' ? !hasApprovedOverride && chainNeedsERC721Approval : false;
  const needsERC1155Approval =
    assetMode === 'erc1155' ? !hasApprovedOverride && chainNeedsERC1155Approval : false;

  const whitelistTx = useWriteContract();
  const approveTx = useWriteContract();
  const depositTx = useWriteContract();
  const whitelistReceipt = useWaitForTransactionReceipt({
    hash: whitelistTx.data,
    query: { enabled: Boolean(whitelistTx.data) },
  });
  const approveReceipt = useWaitForTransactionReceipt({
    hash: approveTx.data,
    query: { enabled: Boolean(approveTx.data) },
  });
  const depositReceipt = useWaitForTransactionReceipt({
    hash: depositTx.data,
    query: { enabled: Boolean(depositTx.data) },
  });

  const fieldClassName =
    'h-10 rounded-none border-2 border-foreground/80 bg-background px-3 text-sm text-foreground shadow-[4px_4px_0_0_var(--color-shadow)] placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0';

  const depositButtonDisabled =
    !isConnected ||
    !validToken ||
    !validMaxShare ||
    depositTx.isPending ||
    (assetMode === 'erc20' && (!validAmount || needsERC20Approval)) ||
    (assetMode === 'erc721' && (!validTokenId || needsERC721Approval)) ||
    (assetMode === 'erc1155' && (!validTokenId || !validAmount || needsERC1155Approval));

  const approveButtonDisabled =
    !isConnected ||
    !validToken ||
    approveTx.isPending ||
    (assetMode === 'erc20' && (!validAmount || !needsERC20Approval)) ||
    (assetMode === 'erc721' && (!validTokenId || !needsERC721Approval)) ||
    (assetMode === 'erc1155' && !needsERC1155Approval);

  const depositTitle =
    assetMode === 'erc20'
      ? t('funding.depositErc20')
      : assetMode === 'erc721'
        ? t('funding.depositErc721')
        : t('funding.depositErc1155');

  const approveTitle =
    assetMode === 'erc20'
      ? `${t('actions.approve')} · ${t('actions.allowance')}: ${(allowance.data ?? 0n).toString()}`
      : assetMode === 'erc721'
        ? t('funding.approveErc721')
        : t('funding.approveErc1155');
  const isWhitelisted = whitelistStatus.data ?? false;

  useTxFeedback({
    action: t('funding.whitelist'),
    tx: whitelistTx,
    receipt: whitelistReceipt,
    successDescription: t('common.whitelisted'),
    onSuccess: () => {
      whitelistStatus.refetch();
      router.refresh();
    },
  });

  useTxFeedback({
    action: t('actions.approve'),
    tx: approveTx,
    receipt: approveReceipt,
    successDescription: t('actions.approved'),
    onSuccess: () => {
      if (assetMode === 'erc721' || assetMode === 'erc1155') {
        setApprovedKeys((current) => ({ ...current, [approvalKey]: true }));
      }
      allowance.refetch();
      erc721Approved.refetch();
      erc1155Approved.refetch();
      router.refresh();
    },
  });

  useTxFeedback({
    action: t('funding.depositAction'),
    tx: depositTx,
    receipt: depositReceipt,
    onSuccess: () => {
      whitelistStatus.refetch();
      router.refresh();
    },
  });

  return (
    <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
      <CardHeader className="border-b-4 border-foreground bg-muted/35 p-5">
        <CardTitle className="jy-display text-base uppercase">{t('funding.title')}</CardTitle>
        <CardDescription>{t('funding.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {!isConnected ? (
          <div className="flex flex-col gap-3 border-2 border-border/60 bg-background/75 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-accent/15 text-foreground">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-foreground">{t('funding.connectPrompt')}</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {t('funding.connectDesc')}
                </p>
              </div>
            </div>
            <Button type="button" onClick={() => connect({ connector: injected() })}>
              <Wallet className="h-4 w-4" />
              {t('nav.connectWallet')}
            </Button>
          </div>
        ) : null}

        <Tabs
          value={assetMode}
          onValueChange={(value) => setAssetMode(value as AssetMode)}
          className="space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-none border-2 border-foreground bg-background p-1">
            <TabsTrigger
              className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
              value="erc20"
            >
              ERC20
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
              value="erc721"
            >
              ERC721
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
              value="erc1155"
            >
              ERC1155
            </TabsTrigger>
          </TabsList>

          <TabsContent value="erc20" className="mt-0 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fundToken20">{t('funding.token')}</Label>
              <Input
                id="fundToken20"
                className={cn(fieldClassName, 'font-mono text-xs')}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fundMaxShare20">{t('funding.maxSharePercent')}</Label>
                <Input
                  id="fundMaxShare20"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  className={fieldClassName}
                  value={maxSharePercent}
                  onChange={(e) => setMaxSharePercent(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fundAmount20">{t('funding.amount')}</Label>
                <Input
                  id="fundAmount20"
                  type="number"
                  min="0"
                  step="1"
                  className={fieldClassName}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="erc721" className="mt-0 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fundToken721">{t('funding.token')}</Label>
                <Input
                  id="fundToken721"
                  className={cn(fieldClassName, 'font-mono text-xs')}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fundTokenId721">{t('funding.tokenId')}</Label>
                <Input
                  id="fundTokenId721"
                  type="number"
                  min="0"
                  step="1"
                  className={fieldClassName}
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="erc1155" className="mt-0 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fundToken1155">{t('funding.token')}</Label>
              <Input
                id="fundToken1155"
                className={cn(fieldClassName, 'font-mono text-xs')}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="fundMaxShare1155">{t('funding.maxSharePercent')}</Label>
                <Input
                  id="fundMaxShare1155"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  className={fieldClassName}
                  value={maxSharePercent}
                  onChange={(e) => setMaxSharePercent(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fundTokenId1155">{t('funding.tokenId')}</Label>
                <Input
                  id="fundTokenId1155"
                  type="number"
                  min="0"
                  step="1"
                  className={fieldClassName}
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fundAmount1155">{t('funding.amount')}</Label>
                <Input
                  id="fundAmount1155"
                  type="number"
                  min="0"
                  step="1"
                  className={fieldClassName}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <ActionRow
          title={t('funding.whitelistStep')}
          button={
            <Button
              variant="outline"
              size="action"
              disabled={
                !isConnected ||
                !validToken ||
                !validMaxShare ||
                whitelistTx.isPending ||
                isWhitelisted
              }
              onClick={() =>
                whitelistTx.writeContract({
                  abi: junkyardPrizePoolAbi,
                  address: prizePoolAddress,
                  functionName: 'whitelistAsset',
                  args: [token as `0x${string}`, true, maxShareBps ?? 0],
                })
              }
            >
              {whitelistTx.isPending
                ? t('common.loading')
                : isWhitelisted
                  ? t('common.whitelisted')
                  : t('funding.whitelist')}
            </Button>
          }
        >
          {assetMode === 'erc721' ? null : (
            <p className="text-xs text-muted-foreground">
              {`${t('funding.maxSharePercent')}: ${maxSharePercent || '0'}% · BPS: ${String(maxShareBps ?? 0)}`}
            </p>
          )}
        </ActionRow>

        <ActionRow
          title={approveTitle}
          button={
            <Button
              variant="secondary"
              size="action"
              disabled={approveButtonDisabled}
              onClick={() => {
                if (!validToken) return;

                if (assetMode === 'erc20') {
                  approveTx.writeContract({
                    abi: erc20Abi,
                    address: token,
                    functionName: 'approve',
                    args: [prizePoolAddress, amountBI ?? 0n],
                  });
                  return;
                }

                if (assetMode === 'erc721') {
                  approveTx.writeContract({
                    abi: erc721Abi,
                    address: token,
                    functionName: 'approve',
                    args: [prizePoolAddress, tokenIdBI ?? 0n],
                  });
                  return;
                }

                approveTx.writeContract({
                  abi: erc1155Abi,
                  address: token,
                  functionName: 'setApprovalForAll',
                  args: [prizePoolAddress, true],
                });
              }}
            >
              {approveTx.isPending ? (
                t('common.loading')
              ) : assetMode === 'erc20' && !needsERC20Approval ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {t('actions.approved')}
                </>
              ) : assetMode === 'erc721' && !needsERC721Approval ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {t('actions.approved')}
                </>
              ) : assetMode === 'erc1155' && !needsERC1155Approval ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {t('actions.approved')}
                </>
              ) : (
                t('actions.approve')
              )}
            </Button>
          }
        />

        <ActionRow
          title={depositTitle}
          button={
            <Button
              size="action"
              disabled={depositButtonDisabled}
              onClick={() => {
                if (!validToken) return;

                if (assetMode === 'erc20') {
                  depositTx.writeContract({
                    abi: junkyardPrizePoolAbi,
                    address: prizePoolAddress,
                    functionName: 'depositERC20',
                    args: [token, amountBI ?? 0n],
                  });
                  return;
                }

                if (assetMode === 'erc721') {
                  depositTx.writeContract({
                    abi: junkyardPrizePoolAbi,
                    address: prizePoolAddress,
                    functionName: 'depositERC721',
                    args: [token, tokenIdBI ?? 0n],
                  });
                  return;
                }

                depositTx.writeContract({
                  abi: junkyardPrizePoolAbi,
                  address: prizePoolAddress,
                  functionName: 'depositERC1155',
                  args: [token, tokenIdBI ?? 0n, amountBI ?? 0n],
                });
              }}
            >
              {depositTx.isPending ? t('common.loading') : t('funding.depositAction')}
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
