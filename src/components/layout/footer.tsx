import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="hidden md:block bg-card pattern-beadwork">
      {/* Beadwork top border */}
      <div className="h-1 bg-gradient-to-r from-[var(--ochre)] via-[var(--teal)] to-[var(--deep-red)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/favicon.png"
                alt="KZN Chess"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-heading font-bold text-lg">
                <span className="text-primary">KZN</span> Chess
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Isikhungo sayo yonke imidlalo ye-chess KwaZulu-Natal — The central hub for chess across KZN.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-heading font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: '/tournaments', label: 'Tournaments' },
                { href: '/gallery', label: 'Gallery' },
                { href: '/feed', label: 'Feed' },
                { href: '/about', label: 'About' },
                { href: '/auth', label: 'Sign In' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Districts */}
          <div>
            <h3 className="text-sm font-heading font-semibold mb-4">Districts</h3>
            <ul className="space-y-2">
              {['eThekwini', 'uMgungundlavu', 'King Cetshwayo', 'Zululand'].map(
                (district) => (
                  <li key={district}>
                    <Link
                      href={`/tournaments?district=${encodeURIComponent(district)}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {district}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-heading font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                info@kznchess.co.za
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                KwaZulu-Natal, South Africa
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-border" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} KZN Chess. All rights reserved.
          </p>
          <a
            href="https://coreaxisdev.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by
            <Image
              src="/core_axis.svg"
              alt="Core Axis Development"
              width={20}
              height={20}
              className="inline-block"
            />
            <span className="font-medium">Core Axis Development</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
