'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { useAccount } from 'wagmi';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/providers/i18n-provider';

export default function SeriesDetailTabs({
  creatorAddress,
  initialPanel = 'overview',
  overview,
  owned,
  admin,
}: {
  creatorAddress: string;
  initialPanel?: 'overview' | 'owned' | 'admin';
  overview: ReactNode;
  owned: ReactNode;
  admin: ReactNode;
}) {
  const { t } = useI18n();
  const { address } = useAccount();
  const isOwner =
    typeof address === 'string' && address.toLowerCase() === creatorAddress.toLowerCase();

  const defaultValue =
    initialPanel === 'admin' && isOwner ? 'admin' : initialPanel === 'owned' ? 'owned' : 'overview';
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <Tabs
      value={value}
      onValueChange={(next) => setValue(next as 'overview' | 'owned' | 'admin')}
      className="space-y-5"
    >
      <TabsList
        className={`grid h-auto w-full rounded-none border-2 border-foreground bg-background p-1 ${
          isOwner ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        <TabsTrigger
          className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
          value="overview"
        >
          {t('series.tabsOverview')}
        </TabsTrigger>
        <TabsTrigger
          className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
          value="owned"
        >
          {t('series.tabsOwned')}
        </TabsTrigger>
        {isOwner ? (
          <TabsTrigger
            className="rounded-none border-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] data-[state=active]:border-foreground data-[state=active]:bg-[color:var(--color-button-hot)] data-[state=active]:text-foreground data-[state=active]:shadow-[3px_3px_0_0_var(--color-shadow)]"
            value="admin"
          >
            {t('series.tabsAdmin')}
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        {overview}
      </TabsContent>
      <TabsContent value="owned" className="mt-0">
        {owned}
      </TabsContent>
      {isOwner ? (
        <TabsContent value="admin" className="mt-0">
          {admin}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
