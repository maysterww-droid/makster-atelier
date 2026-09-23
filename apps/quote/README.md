# Makster Quote 0.1.15

Makster Quote is the quotation-first product in the Makster ecosystem: deterministic furniture costing, commercial variants, immutable client quotes, secure delivery and sales follow-up.

## Current milestone — 0.1.15

The current release hardens real-money calculation paths and completes the first full multilingual application workflow.

Implemented now:

- Email/password auth and protected workshop onboarding
- shared Makster projects, clients and immutable revisions
- workshop Price Book with manual entry, editing, deactivation and CSV import
- Price Book currencies: CZK / EUR / PLN / USD
- strict project-currency isolation: a project never consumes a Price Book row in another currency
- deterministic Engineering Core for lower, wall, tall, open and appliance furniture modules
- part, edge, hardware, operation and labour costing
- worktop, plinth, fillers, decorative side panels and manual one-off cost items
- project-level delivery, installation and other fixed per-order costs
- true cost → target margin → commercial adjustment → tax → payable total
- Base / Standard / Premium commercial variants
- Profit Guardrail with minimum acceptable margin and server-side publish enforcement
- stale/deactivated/cross-currency Price Book reference protection before publication
- payment deposit percentage and calculated deposit amount
- production lead-time text, payment terms and warranty/conditions
- organization-level document/company details under `organizations.settings.quoteBrand`
- application UI languages: RU / EN / CS / DE / PL
- interface language detected from the browser on first use, with manual override persisted in `mq_locale`
- independent client-document language: RU / EN / CS / DE / PL
- localized dashboard, projects, project editor, Price Book, clients, quote pipeline, analytics and settings
- live quotation preview for work in progress
- immutable published quote versions using shared `commercial_estimates` and `client_commercial_quotes`
- append-only quote status history: approved / sent / accepted / rejected / expired
- Sales Intelligence: active pipeline, overdue quotes, 30-day accepted value, follow-up age and aging buckets
- server-generated A4 PDF download from the immutable quote snapshot
- secure public client links for one published quote version
- public client page in the quote language, without Makster login
- public PDF download through the secure client link
- client `Accept` / `Reject` action with an optional note
- revocable and expiring client access links
- SHA-256 token hashes in the database; raw bearer tokens are not persisted
- internal active-link history and explicit link revocation
- Resend email adapter with secure quote link + PDF attachment
- email delivery journal with sent/failed result and provider message id
- quote status changes to `sent` only after a successful email-provider response
- failed email delivery revokes the newly created email link
- serialized terminal status transitions so concurrent client/staff actions cannot silently create opposing final states
- client, project and quote workspaces with search/filter/follow-up cues
- project duplication without copying historical published quote versions
- client/project archiving safeguards
- Lemon Squeezy checkout foundation for Founder / Pro / Workshop variants
- verified Lemon Squeezy webhook endpoint using HMAC SHA-256 `X-Signature`
- idempotent billing event journal and stale-event protection
- subscription sync into `quote_subscriptions`
- Customer Portal hand-off for existing subscriptions, preventing duplicate paid subscriptions
- CI with locked install, TypeScript, multilingual PDF smoke and Next.js production build

See `ENGINEERING_RULES_0.1.2.md` for the frozen calculation assumptions of the current engineering engine. The application release is 0.1.15; the cabinet engineering core intentionally keeps its own engine version until its formulas change.

## Currency safety

Price Book entries carry their own currency. Project editor, server-side cabinet costing, finishing/service selection, live preview and immutable quote publication all filter prices by the project currency.

Makster Quote 0.1.15 deliberately performs no automatic FX conversion. If a workshop quotes in both CZK and EUR, it should maintain explicit CZK and EUR Price Book rows. This keeps cost calculations deterministic and prevents an exchange-rate update from silently changing a saved commercial calculation.

If a Price Book row used by a saved module is later deactivated or moved to another currency, publication is blocked until that module is recalculated with current valid prices.

## Published quote integrity

A published quote is a snapshot, not a live view over mutable project data. Before commercial publication Makster freezes the exact technical project state into an immutable project revision.

The client snapshot stores client and supplier details, project revision, modules, selected extras, commercial terms and client-visible amounts. The internal estimate snapshot separately stores cost and margin data. Client-facing HTML and PDF generation do not expose internal cost or profit.

Later edits to project data, Price Book values or company details do not rewrite historical published versions.

Status transitions are serialized by locking the quote row before writing a terminal event. This prevents nearly simultaneous client/staff actions from silently creating contradictory accepted/rejected states.

## Client link security

Each public client link uses a cryptographically random 32-byte token. Only its SHA-256 hash is stored in `quote_client_access_links`; direct anonymous table access remains revoked.

The anonymous surface is deliberately narrow: `quote_public_snapshot` returns only the immutable client-visible quote snapshot and public status, while `quote_public_respond` accepts only `accepted` or `rejected`.

Links can be revoked by authorized Makster users and have their own expiry. Client response is blocked after the commercial quote's `valid_until` date or after a terminal status.

## PDF and email delivery

`/projects/[projectId]/quote/[quoteId]/pdf` generates the authenticated internal PDF. `/q/[token]/pdf` generates the same client-safe immutable PDF through a valid client link.

PDF generation uses pinned `pdfmake` with embedded Roboto VFS fonts. CI runs a multilingual PDF smoke test with Russian and Central-European text.

The server-side email adapter uses Resend. A successful send includes both a secure client URL and the generated PDF attachment. Makster records `sent` only after the provider returns success. Failed delivery is journaled and the just-created email access link is revoked.

Live email sending is disabled when the required server-only provider configuration is absent. Manual secure-link generation remains available independently of email.

## Billing foundation

Billing uses Lemon Squeezy server-side only. Paid checkout URLs are created for configured Founder / Pro / Workshop variant IDs. Checkout custom data carries `organization_id` and `user_id` so verified subscription webhooks can map purchases back to the Makster workspace.

`/api/webhooks/lemonsqueezy` verifies the HMAC SHA-256 signature before any database write. Billing writes use a server-only Supabase service-role client. Webhook handling is idempotent through `quote_billing_events`, and stale provider events cannot overwrite newer subscription state.

Existing subscribers are sent to the Lemon Squeezy Customer Portal instead of being allowed to create a parallel duplicate subscription.

Commercial prices and actual Lemon Squeezy variant IDs remain external configuration rather than hardcoded product data.

## Product boundary

Makster Quote answers: **What will this furniture order really cost, how do we present it to the client, and did the client accept it?**

Exact CNC coordinates, connector drilling patterns, manufacturer-specific machining profiles, nesting and machine-specific output remain Makster Pro engineering responsibilities. Quote is the commercial costing layer, not a CNC release system.

The client response is a recorded acceptance/rejection event, not a qualified electronic-signature or identity-verification service.

## Environment variables

Only the Supabase publishable key belongs in browser-visible environment variables. Supabase service-role, Resend and Lemon Squeezy credentials are server-only and must never use the `NEXT_PUBLIC_` prefix.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=

RESEND_API_KEY=
QUOTE_EMAIL_FROM=

LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_TEST_MODE=true
LEMONSQUEEZY_VARIANT_FOUNDER=
LEMONSQUEEZY_VARIANT_PRO=
LEMONSQUEEZY_VARIANT_WORKSHOP=
```

`NEXT_PUBLIC_APP_URL` is the canonical application origin used for client quote links and Lemon Squeezy redirects. The Lemon Squeezy webhook callback is:

```text
<NEXT_PUBLIC_APP_URL>/api/webhooks/lemonsqueezy
```

Apply all Makster Quote Supabase migrations in timestamp order before enabling production traffic, live email delivery or live billing.
