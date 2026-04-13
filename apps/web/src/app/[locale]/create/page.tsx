import { isLocale, type Locale } from '@/i18n/i18n';
import { getLocaleAndMessages, t } from '@/i18n/server';
import CreateSeriesForm from '@/components/series/create-series-form';
import { Boxes, ShieldCheck, Sparkles } from 'lucide-react';

export default async function CreatePage({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const locale: Locale = isLocale(p.locale) ? p.locale : 'en';
  const { messages } = getLocaleAndMessages(locale);

  return (
    <div className="space-y-8 py-6">
      <section className="relative overflow-hidden border-4 border-foreground bg-foreground text-background shadow-[8px_8px_0_0_var(--color-shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(700px_280px_at_10%_15%,hsl(140_78%_45%/0.22),transparent_60%),radial-gradient(520px_240px_at_88%_12%,hsl(40_95%_55%/0.18),transparent_52%)]" />
        <div className="absolute inset-0 bg-[url('/sprites/scanlines.png')] opacity-20 mix-blend-overlay" />
        <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              {t(messages, 'create.kicker')}
            </p>
            <div className="space-y-3">
              <h1 className="jy-display text-3xl uppercase leading-tight sm:text-4xl lg:text-5xl">
                {t(messages, 'create.title')}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-background/88 sm:text-base">
                {t(messages, 'create.pageDesc')}
              </p>
              <p className="max-w-2xl text-sm leading-6 text-background/66 sm:text-base">
                {t(messages, 'create.desc')}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              {
                icon: <Boxes className="h-4 w-4" />,
                title: t(messages, 'create.overviewCard1Title'),
                desc: t(messages, 'create.overviewCard1Desc'),
              },
              {
                icon: <ShieldCheck className="h-4 w-4" />,
                title: t(messages, 'create.overviewCard2Title'),
                desc: t(messages, 'create.overviewCard2Desc'),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border-2 border-background/30 bg-background/10 p-4 backdrop-blur-[2px]"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center border border-accent/40 bg-accent/15 text-accent">
                  {item.icon}
                </div>
                <p className="jy-display text-sm uppercase text-background">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-background/72">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CreateSeriesForm />
    </div>
  );
}
