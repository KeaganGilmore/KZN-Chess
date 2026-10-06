import { LegalDocument } from '@/components/legal/legal-document';
import { legalVariables, renderLegalMarkdown } from '@/lib/legal';
import privacySource from '@/content/legal/privacy.md';

export const metadata = {
  title: 'Privacy Policy - KZN Chess',
  description: 'How KZN Chess collects, uses, shares and protects personal information under POPIA.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      markdown={renderLegalMarkdown(privacySource, legalVariables())}
      related={{ href: '/terms', label: 'Terms of Service' }}
    />
  );
}
