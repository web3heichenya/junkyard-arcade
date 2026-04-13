'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/providers/i18n-provider';

export default function NotFound() {
  const { locale, t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="jy-display text-base">404</CardTitle>
          <CardDescription>{t('notFound.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/${locale}`}>{t('notFound.goHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
