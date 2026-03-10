import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { pickLocale } from '@/i18n/server';

export default async function RootPage() {
  const h = await headers();
  redirect(`/${pickLocale(h.get('accept-language'))}`);
}
