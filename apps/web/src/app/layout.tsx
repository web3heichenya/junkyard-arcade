import type { Metadata } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';

import './globals.css';

import { cn } from '@/lib/utils';

const fontBody = VT323({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-body',
});

const fontDisplay = Press_Start_2P({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Junkyard Arcade',
  description: 'Onchain blind boxes for memecoin and NFT junk, with verifiable randomness.',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Junkyard Arcade',
    description: 'Onchain blind boxes for memecoin and NFT junk, with verifiable randomness.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Junkyard Arcade',
    description: 'Onchain blind boxes for memecoin and NFT junk, with verifiable randomness.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-dvh jy-bg', fontBody.variable, fontDisplay.variable)}>
        {children}
      </body>
    </html>
  );
}
