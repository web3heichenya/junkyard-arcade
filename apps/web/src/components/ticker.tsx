import * as React from 'react';
import Marquee from 'react-fast-marquee';

export function Ticker({ text }: { text: string }) {
  return (
    <div className="w-full overflow-hidden border-b-2 border-y-foreground/70 bg-accent text-accent-foreground py-1.5 flex whitespace-nowrap">
      <Marquee
        gradient={false}
        speed={40}
        className="jy-display text-[10px] md:text-xs uppercase tracking-[0.2em]"
      >
        {/* Repeat enough times to fill screen + scroll smoothly */}
        {[...Array(10)].map((_, i) => (
          <span key={i} className="px-4">
            {text}
          </span>
        ))}
      </Marquee>
    </div>
  );
}
