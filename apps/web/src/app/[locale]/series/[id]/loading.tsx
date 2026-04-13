import { Sparkles, Ticket } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function HeroRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-background/20 py-3 last:border-b-0 last:pb-0">
      <Skeleton className="h-4 w-24 bg-background/20" />
      <Skeleton className="h-4 w-32 bg-background/20" />
    </div>
  );
}

function InfoRows({ rows = 4 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-start justify-between gap-3 border-b border-border/50 py-3 last:border-b-0 last:pb-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

function SectionHeaderSkeleton({ number }: { number: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono tracking-[0.3em] text-accent">{number}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function AssetConfigCardSkeleton() {
  return (
    <article className="flex h-full flex-col overflow-hidden border-2 border-foreground bg-background/85 shadow-[5px_5px_0_0_var(--color-shadow)]">
      <div className="space-y-4 border-b-2 border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
      <div className="grid flex-1 gap-3 p-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-2 border-border/60 bg-card p-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-7 w-24" />
          </div>
        ))}
      </div>
    </article>
  );
}

function LeftoverCardSkeleton() {
  return (
    <div className="grid gap-3 border-2 border-border/60 bg-background/75 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="grid gap-2">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-start justify-between gap-3 py-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  );
}

export default function SeriesDetailLoading() {
  return (
    <div className="space-y-8 py-6">
      <section className="relative overflow-hidden border-4 border-foreground bg-foreground text-background shadow-[8px_8px_0_0_var(--color-shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(760px_320px_at_12%_16%,hsl(140_78%_45%/0.22),transparent_58%),radial-gradient(560px_260px_at_88%_14%,hsl(40_95%_55%/0.18),transparent_52%)]" />
        <div className="absolute inset-0 bg-[url('/sprites/scanlines.png')] opacity-20 mix-blend-overlay" />

        <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1">
                <Ticket className="h-3.5 w-3.5 text-accent" />
                <Skeleton className="h-4 w-28 bg-background/20" />
              </div>
              <Skeleton className="h-6 w-20 bg-background/20" />
            </div>

            <div className="space-y-3">
              <Skeleton className="h-10 w-2/3 bg-background/20" />
              <Skeleton className="h-4 w-full bg-background/20" />
              <Skeleton className="h-4 w-5/6 bg-background/20" />
              <Skeleton className="h-4 w-44 bg-background/20" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border border-background/20 bg-black/20 p-4">
                  <Skeleton className="h-4 w-20 bg-background/20" />
                  <Skeleton className="mt-2 h-8 w-24 bg-background/20" />
                  <Skeleton className="mt-3 h-2 w-full bg-background/20" />
                  {index > 0 ? <Skeleton className="mt-3 h-4 w-20 bg-background/20" /> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="border-2 border-background/30 bg-background/10 p-4 backdrop-blur-[2px]">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-accent/90">
              <Skeleton className="h-4 w-24 bg-background/20" />
              <Sparkles className="h-4 w-4 text-accent" />
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="border border-background/20 bg-black/20 p-3">
                    <Skeleton className="h-4 w-16 bg-background/20" />
                    <Skeleton className="mt-2 h-7 w-24 bg-background/20" />
                  </div>
                ))}
              </div>

              <div className="border border-background/20 bg-black/20 p-3">
                <HeroRowSkeleton />
                <HeroRowSkeleton />
                <HeroRowSkeleton />
                <HeroRowSkeleton />
              </div>

              <Skeleton className="h-11 w-full bg-background/20" />
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <div className="grid h-auto w-full grid-cols-3 rounded-none border-2 border-foreground bg-background p-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-none border-2 border-transparent px-3 py-2">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <section className="space-y-5">
            <SectionHeaderSkeleton number="01" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card
                  key={index}
                  className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
                >
                  <CardHeader className="border-b-4 border-foreground bg-muted/35">
                    <CardTitle>
                      <Skeleton className="h-5 w-36" />
                    </CardTitle>
                    <CardDescription>
                      <Skeleton className="h-4 w-3/4" />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <InfoRows rows={index === 0 ? 4 : 5} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <SectionHeaderSkeleton number="02" />
            <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
              <CardHeader className="border-b-4 border-foreground bg-muted/35">
                <CardTitle>
                  <Skeleton className="h-5 w-40" />
                </CardTitle>
                <CardDescription>
                  <Skeleton className="h-4 w-3/4" />
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <AssetConfigCardSkeleton key={index} />
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-5">
            <SectionHeaderSkeleton number="03" />
            <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
              <CardHeader className="border-b-4 border-foreground bg-muted/35">
                <CardTitle>
                  <Skeleton className="h-5 w-40" />
                </CardTitle>
                <CardDescription>
                  <Skeleton className="h-4 w-2/3" />
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-5">
                {Array.from({ length: 2 }).map((_, index) => (
                  <LeftoverCardSkeleton key={index} />
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
