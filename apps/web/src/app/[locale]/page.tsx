import Image from 'next/image';

import Hero from '@/components/hero';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { isLocale, type Locale } from '@/i18n/i18n';
import { getLocaleAndMessages, t } from '@/i18n/server';
import { Swords } from 'lucide-react';

function StoryIllustration({ src, title }: { src: string; title: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="relative w-full max-w-[460px]">
        <Image
          src={src}
          alt={title}
          width={720}
          height={720}
          className="mx-auto h-auto w-full object-contain pixelated"
          priority={false}
        />
      </div>
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const locale: Locale = isLocale(p.locale) ? p.locale : 'en';
  const { messages } = getLocaleAndMessages(locale);

  return (
    <div className="space-y-8">
      <Hero />
      <section className="space-y-10 mt-24 py-12 relative">
        {/* Background Particles Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 grid place-items-center opacity-5 pointer-events-none">
          <Swords className="w-[500px] h-[500px]" />
        </div>

        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <p className="inline-block border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-accent dark:border-accent/35 dark:bg-accent/14">
            ◆ {t(messages, 'home.flowEyebrow')} ◆
          </p>
          <h2 className="jy-display text-2xl sm:text-3xl uppercase text-foreground">
            {t(messages, 'home.flowTitle')}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['Lv.1', t(messages, 'home.step1Title'), t(messages, 'home.step1Desc'), 'SUMMON'],
            ['Lv.2', t(messages, 'home.step2Title'), t(messages, 'home.step2Desc'), 'ROLL'],
            ['Lv.3', t(messages, 'home.step3Title'), t(messages, 'home.step3Desc'), 'LOOT'],
          ].map(([id, title, desc, tag]) => (
            <Card
              key={id}
              className="border-4 border-foreground bg-card shadow-[6px_6px_0_0_var(--color-shadow)] transform transition-transform hover:-translate-y-2 hover:shadow-[10px_10px_0_0_var(--color-shadow)] group flex flex-col"
            >
              <CardHeader className="space-y-4 border-b-2 border-border/50 bg-muted/30 relative overflow-hidden shrink-0">
                <div className="absolute right-0 top-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors"></div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="w-fit text-sm border-2 rounded-none">
                    {id}
                  </Badge>
                  <span className="jy-display rotate-12 text-xs text-muted-foreground/70 dark:text-foreground/65">
                    {tag}
                  </span>
                </div>
                <CardTitle className="jy-display text-lg group-hover:text-accent transition-colors">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="grow bg-[url('/sprites/scanlines.png')] bg-size-[4px_4px] pt-6 pb-8 font-(--font-body) text-base leading-relaxed tracking-wide text-muted-foreground dark:text-foreground/82 dark:mix-blend-normal mix-blend-multiply">
                {desc}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-12 py-14">
        {[
          {
            kicker: t(messages, 'home.story1Kicker'),
            title: t(messages, 'home.story1Title'),
            src: '/illustrations/1.png',
          },
          {
            kicker: t(messages, 'home.story2Kicker'),
            title: t(messages, 'home.story2Title'),
            src: '/illustrations/2.png',
          },
          {
            kicker: t(messages, 'home.story3Kicker'),
            title: t(messages, 'home.story3Title'),
            src: '/illustrations/3.png',
          },
        ].map((item, index) => (
          <div
            key={item.title}
            className={`grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center ${
              index % 2 === 1 ? 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1' : ''
            }`}
          >
            <StoryIllustration src={item.src} title={item.title} />
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
                  {item.kicker}
                </p>
                <h3 className="jy-display text-2xl uppercase leading-tight text-foreground sm:text-3xl">
                  {item.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="inline-block border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-accent dark:border-accent/35 dark:bg-accent/14">
              ◆ {t(messages, 'home.faqKicker')} ◆
            </p>
            <h2 className="jy-display text-2xl uppercase text-foreground sm:text-3xl">
              {t(messages, 'home.faqTitle')}
            </h2>
          </div>

          <div className="border-4 border-foreground bg-card px-6 py-2 text-left shadow-[8px_8px_0_0_var(--color-shadow)]">
            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  value: 'item-1',
                  question: t(messages, 'home.faq1Question'),
                  answer: t(messages, 'home.faq1Answer'),
                },
                {
                  value: 'item-2',
                  question: t(messages, 'home.faq2Question'),
                  answer: t(messages, 'home.faq2Answer'),
                },
                {
                  value: 'item-3',
                  question: t(messages, 'home.faq3Question'),
                  answer: t(messages, 'home.faq3Answer'),
                },
                {
                  value: 'item-4',
                  question: t(messages, 'home.faq4Question'),
                  answer: t(messages, 'home.faq4Answer'),
                },
              ].map((item) => (
                <AccordionItem key={item.value} value={item.value}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </div>
  );
}
