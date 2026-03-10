'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/providers/i18n-provider';

type TxState = {
  isPending: boolean;
  data?: `0x${string}`;
  error?: unknown;
};

type ReceiptState<TData = unknown> = {
  isSuccess: boolean;
  isError: boolean;
  data?: TData;
  error?: unknown;
};

export function useTxFeedback<TData = unknown>({
  action,
  tx,
  receipt,
  sentDescription,
  successDescription,
  onSuccess,
}: {
  action: string;
  tx: TxState;
  receipt: ReceiptState<TData>;
  sentDescription?: string;
  successDescription?: string;
  onSuccess?: (data: TData | undefined) => void;
}) {
  const { t } = useI18n();
  const toastIdRef = React.useRef<string | number | null>(null);
  const successHandledRef = React.useRef(false);

  React.useEffect(() => {
    if (!tx.isPending) return;
    toastIdRef.current = toast.loading(t('common.txPreparing'), {
      id: toastIdRef.current ?? undefined,
      description: action,
    });
  }, [action, t, tx.isPending]);

  React.useEffect(() => {
    if (!tx.data) return;
    if (receipt.isSuccess || receipt.isError) return;

    toastIdRef.current = toast.message(t('common.txSent'), {
      id: toastIdRef.current ?? undefined,
      description: sentDescription ?? action,
    });
    successHandledRef.current = false;
  }, [action, receipt.isError, receipt.isSuccess, sentDescription, t, tx.data]);

  React.useEffect(() => {
    if (!tx.error) return;

    const description = tx.error instanceof Error ? tx.error.message : t('common.unknownError');
    toast.error(t('common.txFailed'), {
      id: toastIdRef.current ?? undefined,
      description,
    });
    toastIdRef.current = null;
    successHandledRef.current = false;
  }, [t, tx.error]);

  React.useEffect(() => {
    if (!receipt.error) return;

    const description =
      receipt.error instanceof Error ? receipt.error.message : t('common.unknownError');
    toast.error(t('common.txFailed'), {
      id: toastIdRef.current ?? undefined,
      description,
    });
    toastIdRef.current = null;
    successHandledRef.current = false;
  }, [receipt.error, t]);

  React.useEffect(() => {
    if (!receipt.isSuccess || successHandledRef.current) return;

    successHandledRef.current = true;
    toast.success(t('common.txSuccess'), {
      id: toastIdRef.current ?? undefined,
      description: successDescription ?? action,
    });
    toastIdRef.current = null;
    onSuccess?.(receipt.data);
  }, [action, onSuccess, receipt.data, receipt.isSuccess, successDescription, t]);
}
