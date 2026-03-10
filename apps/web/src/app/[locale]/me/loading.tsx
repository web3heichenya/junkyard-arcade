import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8 py-6">
      <section className="overflow-hidden border-4 border-foreground bg-foreground shadow-[8px_8px_0_0_var(--color-shadow)]">
        <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-5">
            <div className="flex gap-2">
              <Skeleton className="h-7 w-36 bg-background/15" />
              <Skeleton className="h-7 w-28 bg-background/15" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-2/3 bg-background/15" />
              <Skeleton className="h-5 w-full max-w-2xl bg-background/15" />
              <Skeleton className="h-5 w-2/3 bg-background/15" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border border-background/20 bg-black/20 p-4">
                  <Skeleton className="h-4 w-24 bg-background/15" />
                  <Skeleton className="mt-3 h-8 w-20 bg-background/15" />
                  <Skeleton className="mt-3 h-4 w-full bg-background/15" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-2 border-background/30 bg-background/10 p-4">
            <Skeleton className="h-4 w-28 bg-background/15" />
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full bg-background/15" />
              ))}
              <Skeleton className="h-11 w-full bg-background/15" />
            </div>
          </div>
        </div>
      </section>

      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section key={sectionIndex} className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-px flex-1" />
            </div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-full max-w-3xl" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={index}
                className="overflow-hidden border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
              >
                <Skeleton className="h-44 rounded-none border-b-4 border-foreground" />
                <CardContent className="grid gap-4 p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="border-4 border-foreground bg-card shadow-[8px_8px_0_0_var(--color-shadow)]"
          >
            <div className="p-5">
              <Skeleton className="h-9 w-9" />
            </div>
            <CardContent className="pt-0 p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-3 h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
