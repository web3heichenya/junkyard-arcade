'use client';

import * as React from 'react';
import Link from 'next/link';
import Avatar from 'boring-avatars';
import { LogOut, Package } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from '@wagmi/core';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/providers/i18n-provider';

export function WalletButton() {
  const { locale, t } = useI18n();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (!isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded-none border-2 border-foreground bg-card text-foreground shadow-[4px_4px_0_0_var(--color-shadow)] font-(--font-body) text-sm tracking-wider uppercase hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-shadow)] active:translate-y-0.5 active:shadow-[2px_2px_0_0_var(--color-shadow)] transition-transform h-10 px-4 whitespace-nowrap"
        onClick={() => connect({ connector: injected() })}
      >
        {t('nav.connectWallet')}
      </Button>
    );
  }

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-none border-2 border-foreground bg-card px-2 py-1.5 shadow-[4px_4px_0_0_var(--color-shadow)] transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-shadow)] active:translate-y-0.5 active:shadow-[2px_2px_0_0_var(--color-shadow)] cursor-pointer"
          aria-label="Wallet menu"
        >
          <Avatar
            size={28}
            name={address || '0x0'}
            variant="pixel"
            colors={['#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899']}
          />
          <span className="hidden sm:inline text-xs font-(--font-body) tracking-wider text-foreground">
            {shortAddr}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/me`} className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('nav.me')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t('nav.disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
