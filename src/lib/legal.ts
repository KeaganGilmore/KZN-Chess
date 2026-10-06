import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from './site';

/**
 * Version of the Terms of Service and Privacy Policy currently published.
 * Bump it (to the new effective date) whenever either document changes
 * materially: it is stored with every acceptance (users.terms_version,
 * orders.terms_version), so we can tell which text someone agreed to.
 */
export const LEGAL_VERSION = '2026-10-06';
export const LEGAL_EFFECTIVE_DATE = '6 October 2026';

export interface CompanyDetails {
  legalName: string;
  tradingName: string;
  /** CIPC registration number, e.g. '2023/123456/07'. */
  registrationNumber: string | null;
  /** Directors / office bearers (ECTA s43(1)(f)). */
  directors: string[];
  /** Also the address for service of legal documents (ECTA s43(1)(g)). */
  physicalAddress: string;
  phone: string | null;
  informationOfficer: string;
  vatRegistered: boolean;
  vatNumber: string | null;
}

/**
 * The operator of KZN Chess, as disclosed under ECTA s43 and POPIA s18.
 * A null/empty field is left out of the published documents until it is set,
 * so never fill one with a placeholder.
 */
export const COMPANY: CompanyDetails = {
  legalName: 'Core Axis Development (Pty) Ltd',
  tradingName: SITE_NAME,
  registrationNumber: null,
  directors: [],
  physicalAddress: '3 Syringa Road, Pennington, KwaZulu-Natal, South Africa',
  phone: null,
  informationOfficer: 'Keagan Gilmore',
  vatRegistered: false,
  vatNumber: null,
};

/** Markdown bullet list of the supplier details ECTA s43 requires. */
export function companyDetailsMarkdown(company: CompanyDetails, contactEmail: string, siteUrl: string): string {
  const lines = [
    `- **Legal name:** ${company.legalName}, a private company registered in South Africa, trading as ${company.tradingName}`,
    company.registrationNumber && `- **Registration number:** ${company.registrationNumber}`,
    company.directors.length > 0 &&
      `- **Director${company.directors.length > 1 ? 's' : ''}:** ${company.directors.join(', ')}`,
    `- **Physical address and address for legal notices:** ${company.physicalAddress}`,
    company.phone && `- **Telephone:** ${company.phone}`,
    `- **Email:** ${contactEmail}`,
    `- **Website:** ${siteUrl}`,
    `- **VAT:** ${vatStatement(company)}`,
    `- **Information Officer:** ${company.informationOfficer}`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function vatStatement(company: CompanyDetails): string {
  if (!company.vatRegistered) {
    return `${company.legalName} is not registered for VAT, so no VAT is charged on our prices.`;
  }
  return `Registered for VAT${company.vatNumber ? ` (VAT number ${company.vatNumber})` : ''}. Prices include VAT.`;
}

/** Values for the {{TOKENS}} used in src/content/legal/*.md. */
export function legalVariables(): Record<string, string> {
  return {
    COMPANY_NAME: COMPANY.legalName,
    TRADING_NAME: COMPANY.tradingName,
    PHYSICAL_ADDRESS: COMPANY.physicalAddress,
    INFORMATION_OFFICER: COMPANY.informationOfficer,
    CONTACT_EMAIL,
    SITE_URL,
    SITE_HOST: new URL(SITE_URL).host,
    EFFECTIVE_DATE: LEGAL_EFFECTIVE_DATE,
    VAT_STATEMENT: vatStatement(COMPANY),
    COMPANY_DETAILS: companyDetailsMarkdown(COMPANY, CONTACT_EMAIL, SITE_URL),
  };
}

/**
 * Fill {{TOKENS}} in a legal Markdown document. Throws on a token with no
 * value so a typo can never publish a literal "{{...}}" in binding text.
 */
export function renderLegalMarkdown(source: string, vars: Record<string, string>): string {
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => {
    if (!(key in vars)) throw new Error(`Unknown legal document token: {{${key}}}`);
    return vars[key];
  });
}

/** Anchor id for a heading: "8. Buying from the store" -> "buying-from-the-store". */
export function slugifyHeading(text: string): string {
  return text
    .replace(/^\s*\d+(\.\d+)*\.?\s+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

export interface LegalHeading {
  text: string;
  id: string;
}

/** The document's "## " headings, for the table of contents. */
export function legalHeadings(markdown: string): LegalHeading[] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => {
      const text = line.slice(3).trim();
      return { text, id: slugifyHeading(text) };
    });
}
