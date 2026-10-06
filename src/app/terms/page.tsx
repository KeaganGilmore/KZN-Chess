import { LegalDocument } from '@/components/legal/legal-document';
import { legalVariables, renderLegalMarkdown } from '@/lib/legal';
import termsSource from '@/content/legal/terms.md';

export const metadata = {
  title: 'Terms of Service - KZN Chess',
  description: 'The terms for using KZN Chess, taking part in tournaments listed here and buying from the KZN Chess store.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      markdown={renderLegalMarkdown(termsSource, legalVariables())}
      related={{ href: '/privacy', label: 'Privacy Policy' }}
    />
  );
}
