import Link from 'next/link';
import { Mail, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary-foreground" fill="currentColor">
                  <path d="M19 22H5v-2h14v2M17.16 8.26A4.96 4.96 0 0018 5.5C18 3.02 15.98 1 13.5 1S9 3.02 9 5.5c0 .98.28 1.9.77 2.67L6 12l1.77 2.83A4.96 4.96 0 007 17.5C7 19.98 9.02 22 11.5 22s4.5-2.02 4.5-4.5c0-.98-.28-1.9-.77-2.67L19 12l-1.84-3.74z" />
                </svg>
              </div>
              <span className="font-heading font-bold text-lg">
                <span className="text-primary">KZN</span> Chess
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The central hub for all chess tournaments across KwaZulu-Natal, South Africa.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-heading font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: '/tournaments', label: 'Tournaments' },
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
          <p className="text-xs text-muted-foreground">
            Built for the KwaZulu-Natal chess community
          </p>
        </div>
      </div>
    </footer>
  );
}
