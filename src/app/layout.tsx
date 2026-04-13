import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { SessionProvider } from '@/components/providers/session-provider';
import { Navbar } from '@/components/layout/navbar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KZN Chess - Every Tournament, One Place',
  description:
    'The central hub for all chess tournaments across KwaZulu-Natal, South Africa. Find events, register, and grow the chess community.',
  keywords: ['chess', 'KwaZulu-Natal', 'KZN', 'tournament', 'South Africa'],
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'KZN Chess - Every Tournament, One Place',
    description:
      'The central hub for all chess tournaments across KwaZulu-Natal, South Africa.',
    url: 'https://kznchess.co.za',
    siteName: 'KZN Chess',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      {process.env.NEXT_PUBLIC_ADSENSE_PUB_ID && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <SessionProvider>
          <Navbar />
          <main className="flex-1 pt-16 pb-16 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
