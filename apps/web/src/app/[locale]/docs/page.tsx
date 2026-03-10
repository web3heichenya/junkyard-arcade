import { BookOpen, ChevronRight } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { getDocsContent } from '@/lib/docs-content';
import { isLocale, type Locale } from '@/i18n/i18n';
import { getLocaleAndMessages } from '@/i18n/server';

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const locale: Locale = isLocale(p.locale) ? p.locale : 'en';
  const { messages } = getLocaleAndMessages(locale);
  const docs = getDocsContent(messages);
  const pages = docs.pages;
  const groups = pages.reduce<Array<{ label: string; pages: typeof pages }>>((acc, page) => {
    const group = acc.find((item) => item.label === page.groupLabel);

    if (group) {
      group.pages.push(page);
      return acc;
    }

    acc.push({ label: page.groupLabel, pages: [page] });
    return acc;
  }, []);

  return (
    <div className="jy-bg min-h-full">
      <div className="mx-auto grid w-full max-w-[1440px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="py-6 lg:py-10">
          <div className="lg:sticky lg:top-[105px]">
            <div className="rounded-[24px] border border-border/70 bg-card/88 p-5 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.24)] lg:flex lg:h-[calc(100dvh-65px-5rem)] lg:flex-col">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="jy-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {docs.sidebarEyebrow}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{docs.sidebarTitle}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {docs.sidebarDescription}
              </p>
              <ScrollArea className="mt-5 border-t border-border/70 pt-5 lg:min-h-0 lg:flex-1">
                <nav className="space-y-6 pr-4">
                  {groups.map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="mt-3 space-y-4">
                        {group.pages.map((page) => (
                          <div key={`${page.category}-${page.slug}`}>
                            <a
                              href={`#${page.slug}`}
                              className="block rounded-2xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
                            >
                              <span>{page.navLabel}</span>
                            </a>
                            <div className="mt-2 space-y-1 pl-4">
                              {page.sections.map((section) => (
                                <a
                                  key={section.id}
                                  href={`#${page.slug}-${section.id}`}
                                  className="block rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                                >
                                  {section.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </ScrollArea>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-6 md:px-6 lg:px-10 lg:py-10">
          <div className="rounded-[30px] border border-border/70 bg-card/90 px-5 py-6 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.28)] md:px-8 md:py-8">
            <div className="border-b border-border/70 pb-8">
              <div className="min-w-0">
                <p className="jy-display text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {docs.heroEyebrow}
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {docs.heroTitle}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                  {docs.heroDescription}
                </p>
              </div>
            </div>
            <article className="space-y-12 pt-8 md:space-y-14 md:pt-10">
              {pages.map((page) => (
                <section key={page.slug} id={page.slug} className="scroll-mt-24">
                  <div className="min-w-0">
                    <p className="jy-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {page.eyebrow}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                      {page.title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-base leading-8 text-muted-foreground">
                      {page.description}
                    </p>
                  </div>

                  <div className="mt-6 space-y-6">
                    {page.sections.map((section) => (
                      <section
                        key={section.id}
                        id={`${page.slug}-${section.id}`}
                        className="scroll-mt-24 rounded-[24px] border border-border/70 bg-background/72 px-4 py-5 md:px-6 md:py-6"
                      >
                        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                          {section.title}
                        </h3>
                        <div className="mt-4 space-y-4">
                          {section.blocks.map((block, index) => {
                            if (block.type === 'paragraph') {
                              return (
                                <p
                                  key={`${section.id}-${index}`}
                                  className="text-base leading-8 text-muted-foreground"
                                >
                                  {block.content}
                                </p>
                              );
                            }

                            if (block.type === 'list') {
                              return (
                                <ul
                                  key={`${section.id}-${index}`}
                                  className="space-y-3 pl-5 text-base leading-8 text-muted-foreground"
                                >
                                  {block.items.map((item) => (
                                    <li key={item} className="list-disc">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              );
                            }

                            if (block.type === 'quote') {
                              return (
                                <blockquote
                                  key={`${section.id}-${index}`}
                                  className="border-l-4 border-accent pl-4 text-lg italic leading-8 text-foreground/90"
                                >
                                  {block.content}
                                </blockquote>
                              );
                            }

                            return (
                              <pre
                                key={`${section.id}-${index}`}
                                className="overflow-x-auto rounded-[20px] border border-border bg-foreground px-4 py-4 text-sm leading-7 text-background"
                              >
                                <code>{block.code}</code>
                              </pre>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ))}
            </article>

            <div className="flex items-center gap-2 border-t border-border/70 pt-6 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{docs.footerLabel}</span>
              <ChevronRight className="h-4 w-4" />
              <span>{docs.footerCurrent}</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
