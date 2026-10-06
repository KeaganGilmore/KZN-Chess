# Terms of Service and Privacy Policy — design

**Date:** 2026-10-06
**Status:** Approved in conversation (scope + operator facts confirmed by owner)

## Goal

Make kznchess.co.za ready for commercial use by publishing a Terms of Service
(including terms of sale for the store) and a POPIA Privacy Policy that
accurately describe what the code does, recording acceptance, and fixing the
two data leaks that would otherwise make the privacy policy untrue.

## Facts (from owner)

| Item | Value |
|---|---|
| Operator / responsible party / supplier | Core Axis Development (Pty) Ltd, trading as KZN Chess |
| CIPC registration number | Not yet supplied — rendered only once set in `src/lib/legal.ts` |
| Physical address (legal service) | 3 Syringa Road, Pennington, KwaZulu-Natal |
| VAT | Not registered — prices carry no VAT; "VAT incl." copy removed |
| Information Officer | Keagan Gilmore |
| Contact email | `CONTACT_EMAIL` (`NEXT_PUBLIC_CONTACT_EMAIL`, falls back to the Gmail) |
| Minors | Under-18s may use the site with a parent/guardian's consent; organisers must obtain guardian consent before entering junior players |
| Returns | Legal minimum: ECTA s44 7-day cooling-off (s42(2) exclusions incl. books), CPA s56 6-month defects warranty |

## Decisions

- **Content lives in the repo as Markdown** (`src/content/legal/terms.md`,
  `privacy.md`), bundled at build time via a webpack `asset/source` rule (no
  runtime fs, works with `output: 'standalone'`). `{{TOKENS}}` are filled from
  `src/lib/legal.ts` + `src/lib/site.ts` by a pure `renderLegalMarkdown()`
  that throws on unknown tokens (unit-tested). Git history is the version
  trail; one `LEGAL_VERSION` (date string) covers both documents.
- **Pages:** `/terms`, `/privacy` — server components rendering with
  `react-markdown` (already a dependency) through a shared
  `LegalDocument` component: title, effective date, version, table of
  contents from `##` headings (anchor ids), styled element mapping (no
  typography plugin installed).
- **Acceptance records** (migration `013_legal_acceptance.sql`):
  `users.terms_version/terms_accepted_at`, `orders.terms_version/terms_accepted_at`;
  `place_order()` redefined to store them.
  - Register: required checkbox (terms + privacy + guardian consent if under 18); API rejects without it.
  - Checkout: required checkbox (terms of sale + privacy); `checkoutSchema.accept_terms: z.literal(true)`.
  - New tournament submission: required organiser checkbox (consent from players / guardians); API rejects without it and refreshes the user's acceptance record.
  - Existing users are not gated (browsewrap notice + links).
- **Links:** footer bottom row (desktop) + new mobile-only legal strip (the
  footer grid is desktop-only), auth card, account panel, checkout, sitemap.
  Footer names the operator.
- **Privacy fixes included:**
  - Uploads re-encoded with `sharp` (`.rotate()` auto-orients, metadata dropped) for JPEG/PNG/WebP; GIFs passed through. `scripts/strip-upload-metadata.mjs` cleans files already on the volume.
  - Public tournament + arbiter API embeds drop `users.email` (no UI reads it).
- **VAT copy:** "Prices include VAT" and "VAT incl." removed.

## Out of scope (follow-ups)

Self-service account deletion/export (handled by email request per the
policy), admin photo deletion UI, per-player guardian-consent flag, AdSense
consent mode, public `tournament_players` column trimming.

## Deploy order

Apply migration 013 **before** deploying the code (register inserts the new
user columns). The migration is additive, so old code keeps working.

## Testing

- vitest: `renderLegalMarkdown` (tokens filled, unknown token throws, null
  company fields omitted), `slugifyHeading`, checkout schema requires `accept_terms`.
- `npx next build` passes.
- Manual: /terms and /privacy render with TOC anchors on desktop and mobile;
  register/checkout/submit block without the checkbox.
