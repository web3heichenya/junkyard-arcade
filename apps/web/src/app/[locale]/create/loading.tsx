import type { ReactNode } from 'react';
import { Boxes, RadioTower, Shield, ShieldCheck, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function OverviewCardSkeleton({ icon }: { icon: ReactNode }) {
  return (
    <div className="border-2 border-background/30 bg-background/10 p-4 backdrop-blur-[2px]">
      <div className="mb-3 flex h-9 w-9 items-center justify-center border border-accent/40 bg-accent/15 text-accent">
        {icon}
      </div>
      <Skeleton className="h-4 w-28 bg-background/20" />
      <Skeleton className="mt-2 h-4 w-full bg-background/20" />
      <Skeleton className="mt-2 h-4 w-5/6 bg-background/20" />
    </div>
  );
}

function SectionSkeleton({ icon, rows = 2 }: { icon: ReactNode; rows?: number }) {
  return (
    <section className="space-y-4 border-2 border-foreground/80 bg-card/90 p-4 shadow-[6px_6px_0_0_var(--color-shadow)] sm:p-5">
      <div className="flex items-start gap-3 border-b-2 border-border/60 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-accent/20 text-foreground">
          {icon}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewRowSkeleton({ short = false }: { short?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-3 last:border-b-0 last:pb-0">
      <Skeleton className="h-4 w-20" />
      <Skeleton className={`h-4 ${short ? 'w-24' : 'w-36'}`} />
    </div>
  );
}

export default function CreateLoading() {
  return (
    <div className="space-y-8 py-6">
      <section className="relative overflow-hidden border-4 border-foreground bg-foreground text-background shadow-[8px_8px_0_0_var(--color-shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(700px_280px_at_10%_15%,hsl(140_78%_45%/0.22),transparent_60%),radial-gradient(520px_240px_at_88%_12%,hsl(40_95%_55%/0.18),transparent_52%)]" />
        <div className="absolute inset-0 bg-[url('/sprites/scanlines.png')] opacity-20 mix-blend-overlay" />
        <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 border border-background/30 bg-background/10 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <Skeleton className="h-4 w-24 bg-background/20" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-3/4 bg-background/20" />
              <Skeleton className="h-4 w-full bg-background/20" />
              <Skeleton className="h-4 w-5/6 bg-background/20" />
              <Skeleton className="h-4 w-2/3 bg-background/20" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <OverviewCardSkeleton icon={<Boxes className="h-4 w-4" />} />
            <OverviewCardSkeleton icon={<ShieldCheck className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,360px)]">
        <Card className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
          <CardHeader className="gap-4 border-b-4 border-foreground bg-muted/35 p-5 sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="border-2 border-border/60 bg-background/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-5 sm:p-6">
            <SectionSkeleton icon={<Boxes className="h-4 w-4" />} />
            <SectionSkeleton icon={<RadioTower className="h-4 w-4" />} rows={4} />
            <SectionSkeleton icon={<Shield className="h-4 w-4" />} rows={3} />

            <div className="flex justify-end">
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
            <CardHeader className="border-b-4 border-foreground bg-muted/35">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="p-5">
              <PreviewRowSkeleton />
              <PreviewRowSkeleton short />
              <PreviewRowSkeleton short />
              <PreviewRowSkeleton />
              <PreviewRowSkeleton />
              <PreviewRowSkeleton />
              <PreviewRowSkeleton />
            </CardContent>
          </Card>

          <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
            <CardHeader className="border-b-4 border-foreground bg-muted/35">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 border-2 border-border/60 bg-background/75 p-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-foreground bg-accent/20 text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]">
            <CardHeader className="border-b-4 border-foreground bg-muted/35">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-2 border-border/60 bg-background/75 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center border border-foreground bg-muted/50 text-foreground">
                      {index === 0 ? (
                        <RadioTower className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Skeleton className="h-10 w-full" />
        </div>
      </section>
    </div>
  );
}
