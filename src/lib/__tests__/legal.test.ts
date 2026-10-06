import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  COMPANY,
  companyDetailsMarkdown,
  legalHeadings,
  legalVariables,
  renderLegalMarkdown,
  slugifyHeading,
  vatStatement,
} from '@/lib/legal';

const DOCS = ['terms', 'privacy'] as const;
const source = (doc: (typeof DOCS)[number]) =>
  readFileSync(path.resolve(__dirname, `../../content/legal/${doc}.md`), 'utf8');

describe('renderLegalMarkdown', () => {
  it('fills every token', () => {
    expect(renderLegalMarkdown('Email {{A}} or {{B}}, {{A}}.', { A: 'x', B: 'y' })).toBe('Email x or y, x.');
  });

  it('throws on a token with no value instead of publishing it', () => {
    expect(() => renderLegalMarkdown('Hi {{MISSING}}', {})).toThrow(/MISSING/);
  });

  it.each(DOCS)('renders the published %s document completely', (doc) => {
    const out = renderLegalMarkdown(source(doc), legalVariables());
    expect(out).not.toMatch(/\{\{|\}\}/);
    expect(out).toContain(COMPANY.legalName);
  });
});

describe('companyDetailsMarkdown', () => {
  it('omits details that have not been supplied', () => {
    const md = companyDetailsMarkdown(
      { ...COMPANY, registrationNumber: null, phone: null, directors: [] },
      'a@b.co',
      'https://x.test'
    );
    expect(md).not.toMatch(/Registration number|Telephone|Director/);
    expect(md).not.toMatch(/null|undefined/);
  });

  it('includes them once set', () => {
    const md = companyDetailsMarkdown(
      { ...COMPANY, registrationNumber: '2023/123456/07', phone: '031 000 0000', directors: ['A', 'B'] },
      'a@b.co',
      'https://x.test'
    );
    expect(md).toContain('**Registration number:** 2023/123456/07');
    expect(md).toContain('**Telephone:** 031 000 0000');
    expect(md).toContain('**Directors:** A, B');
  });
});

describe('vatStatement', () => {
  it('never claims VAT for an unregistered supplier', () => {
    expect(vatStatement({ ...COMPANY, vatRegistered: false })).toMatch(/not registered for VAT/);
  });
});

describe('headings and anchors', () => {
  it('slugifies numbered headings without their number', () => {
    expect(slugifyHeading('8. Buying from the KZN Chess store')).toBe('buying-from-the-kzn-chess-store');
    expect(slugifyHeading('8.5 Cancelling within 7 days (cooling-off)')).toBe(
      'cancelling-within-7-days-cooling-off'
    );
    expect(slugifyHeading("6. What's public")).toBe('whats-public');
  });

  it('lists the ## headings for the table of contents', () => {
    expect(legalHeadings('intro\n## 1. One\n### 1.1 Sub\n## 2. Two')).toEqual([
      { text: '1. One', id: 'one' },
      { text: '2. Two', id: 'two' },
    ]);
  });

  // Every in-site link to a legal anchor (in the documents and in the
  // components that link into them) must land on a real heading.
  it('every legal anchor link resolves to a heading', () => {
    const ids: Record<string, Set<string>> = {};
    for (const doc of DOCS) {
      const headings = source(doc).match(/^#{2,3} .+$/gm) ?? [];
      ids[doc] = new Set(headings.map((h) => slugifyHeading(h.replace(/^#+ /, ''))));
    }

    const linkers = [
      ...DOCS.map((d) => ({ file: `content/legal/${d}.md`, self: d as string })),
      { file: 'components/store/checkout-form.tsx', self: '' },
      { file: 'components/tournaments/submit-form.tsx', self: '' },
    ];
    for (const { file, self } of linkers) {
      const text = readFileSync(path.resolve(__dirname, '../..', file), 'utf8');
      for (const [, doc, anchor] of text.matchAll(/(?:\/(terms|privacy))?#([a-z0-9-]+)/g)) {
        const target = doc || self;
        if (!target) continue;
        expect(ids[target].has(anchor), `${file}: /${target}#${anchor}`).toBe(true);
      }
    }
  });
});
