import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import { legalHeadings, slugifyHeading, LEGAL_EFFECTIVE_DATE, LEGAL_VERSION } from '@/lib/legal';

/** Plain text of rendered Markdown children, for heading anchor ids. */
function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return '';
}

const linkClass = 'text-primary underline underline-offset-2 hover:text-primary/80';

const components: Components = {
  h2: ({ node: _node, children, ...props }) => (
    <h2
      {...props}
      id={slugifyHeading(textOf(children))}
      className="scroll-mt-24 font-heading text-xl sm:text-2xl font-bold mt-12 mb-4 pt-8 border-t border-border"
    >
      {children}
    </h2>
  ),
  h3: ({ node: _node, children, ...props }) => (
    <h3
      {...props}
      id={slugifyHeading(textOf(children))}
      className="scroll-mt-24 font-heading text-lg font-semibold mt-8 mb-3"
    >
      {children}
    </h3>
  ),
  p: ({ node: _node, ...props }) => <p {...props} className="my-4 leading-relaxed text-foreground/90" />,
  ul: ({ node: _node, ...props }) => (
    <ul {...props} className="my-4 space-y-2.5 pl-5 list-disc marker:text-primary/70" />
  ),
  li: ({ node: _node, ...props }) => <li {...props} className="pl-1 leading-relaxed text-foreground/90" />,
  strong: ({ node: _node, ...props }) => <strong {...props} className="font-semibold text-foreground" />,
  code: ({ node: _node, ...props }) => (
    <code {...props} className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono break-all" />
  ),
  a: ({ node: _node, href = '', children }) =>
    href.startsWith('/') || href.startsWith('#') ? (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    ),
};

interface LegalDocumentProps {
  title: string;
  /** Rendered Markdown (tokens already filled). */
  markdown: string;
  /** The other legal document, linked from the header. */
  related: { href: string; label: string };
}

export function LegalDocument({ title, markdown, related }: LegalDocumentProps) {
  const headings = legalHeadings(markdown);

  const toc = (
    <ol className="space-y-1.5 text-sm">
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            className="block text-muted-foreground hover:text-foreground transition-colors leading-snug"
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="max-w-3xl mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Effective {LEGAL_EFFECTIVE_DATE} · Version {LEGAL_VERSION} ·{' '}
          <Link href={related.href} className={linkClass}>
            {related.label}
          </Link>
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 items-start">
        <nav aria-label="Contents" className="hidden lg:block sticky top-24 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Contents
          </p>
          {toc}
        </nav>

        <details className="lg:hidden mb-6 rounded-lg border border-border bg-card px-4 py-3 print:hidden">
          <summary className="cursor-pointer text-sm font-semibold py-1">Contents</summary>
          <div className="mt-3">{toc}</div>
        </details>

        <article className="max-w-3xl text-[15px] sm:text-base">
          <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
