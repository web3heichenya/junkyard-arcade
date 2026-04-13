'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/providers/i18n-provider';

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="jy-display text-base">{t('error.title')}</CardTitle>
          <CardDescription>{t('error.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={reset}>{t('error.retry')}</Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}`}>{t('error.goHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
