import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import { SessionProvider } from '@/components/providers/session-provider';
import { CartProvider } from '@/components/store/cart-provider';
import { Navbar } from '@/components/layout/navbar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { JsonLd } from '@/components/seo/json-ld';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

// Self-hosted (npm) so builds never depend on fetching fonts.googleapis.com.
const spaceGrotesk = localFont({
  src: '../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
  variable: '--font-heading',
  display: 'swap',
  weight: '300 700',
});

const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-body',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} - Every Tournament, One Place`,
  description: SITE_DESCRIPTION,
  keywords: ['chess', 'KwaZulu-Natal', 'KZN', 'tournament', 'South Africa'],
  icons: {
    icon: '/favicon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${SITE_NAME} - Every Tournament, One Place`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Every Tournament, One Place`,
    description: SITE_DESCRIPTION,
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/store?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
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
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <SessionProvider>
          <CartProvider>
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
            <BottomNav />
            <Toaster />
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
