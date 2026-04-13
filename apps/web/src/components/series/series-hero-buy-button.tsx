'use client';

import { injected } from '@wagmi/core';
import { Loader2, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

import { junkyardSeriesAbi } from '@/abi/junkyardSeries';
import { Button } from '@/components/ui/button';
import { useTxFeedback } from '@/lib/use-tx-feedback';
import { useI18n } from '@/providers/i18n-provider';

export default function SeriesHeroBuyButton({
  seriesAddress,
  price,
}: {
  seriesAddress: `0x${string}`;
  price: string;
}) {
  const { t } = useI18n();
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const router = useRouter();

  const purchaseTx = useWriteContract();
  const purchaseReceipt = useWaitForTransactionReceipt({
    hash: purchaseTx.data,
    query: { enabled: Boolean(purchaseTx.data) },
  });

  useTxFeedback({
    action: t('series.buy'),
    tx: purchaseTx,
    receipt: purchaseReceipt,
    onSuccess: () => {
      router.refresh();
    },
  });

  return (
    <Button
      type="button"
      className="w-full !bg-[color:var(--color-accent)] !text-[color:var(--color-accent-foreground)] hover:!bg-[color:var(--color-button-hot)]"
      disabled={purchaseTx.isPending}
      onClick={() => {
        if (!isConnected) {
          connect({ connector: injected() });
          return;
        }

        purchaseTx.writeContract({
          abi: junkyardSeriesAbi,
          address: seriesAddress,
          functionName: 'purchase',
          value: BigInt(price || '0'),
        });
      }}
    >
      {purchaseTx.isPending ? (
        <Loader2 className="animate-spin" />
      ) : !isConnected ? (
        <>
          <Wallet className="h-4 w-4" />
          {t('nav.connectWallet')}
        </>
      ) : (
        t('series.buyNow')
      )}
    </Button>
  );
}
