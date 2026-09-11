# Makster Quote 0.1 — Client Delivery & Acceptance 0.1.5

Makster Quote is the quotation-first product in the Makster ecosystem.

## Current milestone

0.1.5 extends the immutable commercial document workflow with secure client delivery and a client-side acceptance flow.

Implemented now:

- Email/password auth and protected workshop onboarding
- shared Makster projects, clients and revisions
- workshop Price Book
- deterministic Engineering Core for `B-Door`, `B-Drawer` and generic cabinets
- part, edge, hardware, operation and labour costing
- project-level delivery, installation and other fixed per-order costs
- true cost → target-margin price → tax → payable total
- payment deposit percentage and calculated deposit amount
- production lead-time text, payment terms and warranty/conditions
- organization-level document/company details under `organizations.settings.quoteBrand`
- client-document language: RU / CS / DE / PL / EN
- live quotation preview for work in progress
- immutable published quote versions using shared `commercial_estimates` and `client_commercial_quotes`
- append-only quote status history: approved / sent / accepted / rejected / expired
- server-generated A4 PDF download from the immutable quote snapshot
- secure public client links for one published quote version
- public client page in the quote language, without Makster login
- public PDF download through the secure client link
- client `Accept` / `Reject` action with an optional note
- revocable and expiring client access links
- SHA-256 token hashes in the database; the raw bearer token is not persisted
- internal active-link history and explicit link revocation
- Resend email adapter with secure quote link + PDF attachment
- email delivery journal with sent/failed result and provider message id
- quote status changes to `sent` only after a successful email-provider response
- failed email delivery revokes the newly created email link
- serialized terminal status transitions so concurrent client/staff actions cannot silently create opposing final states
- CI PDF smoke test that creates a real multilingual PDF buffer before the production build
- explicit blocking of quote publication while cabinet pricing is incomplete

See `ENGINEERING_RULES_0.1.2.md` for the frozen cabinet-calculation assumptions.

## Client link security

Each public client link uses a cryptographically random 32-byte token. Only its SHA-256 hash is stored in `quote_client_access_links`. The public browser receives the raw token in `/q/[token]`; direct anonymous table access remains revoked.

The anonymous surface is deliberately narrow: `quote_public_snapshot` returns only the immutable client-visible quote snapshot and current public status, while `quote_public_respond` accepts only `accepted` or `rejected`. Internal estimate/cost/margin data is not exposed through these RPCs.

Links can be revoked by authorized Makster users and have their own expiry. A client response is additionally blocked after the commercial quote's `valid_until` date or after any terminal status.

## Published quote integrity

A published quote is a snapshot, not a view over mutable project data. It stores the client, supplier details, project revision, module list, selected extras, commercial terms and client-visible amounts at publication time. Later project or company-setting changes do not rewrite the historical version.

The internal estimate snapshot separately stores cost and margin data. Client-facing HTML and PDF generation read only the immutable client quote snapshot and do not expose internal cost or profit.

Status transitions are serialized by locking the quote row before writing a terminal event. This prevents a nearly simultaneous client response and staff action from producing contradictory accepted/rejected states.

## PDF

`/projects/[projectId]/quote/[quoteId]/pdf` generates the authenticated internal PDF download. `/q/[token]/pdf` generates the same client-safe immutable PDF through a valid client link.

PDF generation uses pinned `pdfmake` and embedded Roboto VFS fonts. CI runs a multilingual PDF smoke test containing Russian and Central-European text.

## Email delivery

The server-side email adapter uses Resend. A successful send includes both a secure client URL and the generated PDF attachment. Makster records `sent` only after the provider returns success. A failed delivery is recorded as failed and the just-created email access link is revoked.

The UI intentionally disables live email sending when the server-only provider configuration is absent. Manual secure-link generation remains available independently of email.

## Product boundary

Makster Quote answers: **What will this furniture order really cost, how do we present it to the client, and did the client accept it?**

CRM, warehouse, CNC release, production scheduling, accounting and AI Office remain in the wider Makster platform. Quote reuses shared business records instead of creating parallel clients/projects.

The 0.1.5 client response is a recorded acceptance/rejection event, not a qualified electronic signature service. Legal e-signature/identity verification can be added later if required by the sales process or jurisdiction.

Exact CNC coordinates, connector drilling patterns, manufacturer-specific manufacturing profiles, nesting and machine-specific output remain later Makster Pro engineering layers.

## Languages

Owner-testing UI is Russian-first. Client document/public acceptance language is independent and currently supports RU / CS / DE / PL / EN.

## Environment variables

Use only the publishable Supabase key in browser-visible environment variables. Resend credentials remain server-only and must never use the `NEXT_PUBLIC_` prefix.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=

RESEND_API_KEY=
QUOTE_EMAIL_FROM=
```

`NEXT_PUBLIC_APP_URL` should be the canonical public application origin used in client quote links. If it is absent, the action can derive the origin from the incoming request/Vercel host, but an explicit production value is preferred.
