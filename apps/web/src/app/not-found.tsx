import Link from 'next/link';
import { headers } from 'next/headers';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLocaleAndMessages, pickLocale, t } from '@/i18n/server';

export default async function NotFound() {
  const h = await headers();
  const locale = pickLocale(h.get('accept-language'));
  const { messages } = getLocaleAndMessages(locale);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="jy-display text-base">404</CardTitle>
          <CardDescription>{t(messages, 'notFound.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/${locale}`}>{t(messages, 'notFound.goHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
