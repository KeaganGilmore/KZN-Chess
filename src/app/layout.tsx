import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { SessionProvider } from '@/components/providers/session-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'KZN Chess - Every Tournament, One Place',
  description:
    'The central hub for all chess tournaments across KwaZulu-Natal, South Africa. Find events, register, and grow the chess community.',
  keywords: ['chess', 'KwaZulu-Natal', 'KZN', 'tournament', 'South Africa'],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <SessionProvider>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
