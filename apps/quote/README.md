# Makster Quote 0.2

Makster Quote is the quotation-first product in the Makster ecosystem: deterministic furniture costing, commercial variants, immutable client quotes, secure delivery and sales follow-up.

## Current product pass — 0.2

The current branch keeps the proven 0.1.15 commercial core and adds the final product-flow, measurements, expanded library, Price Book onboarding/transparency and canonical Stripe plan model before the controlled production merge.

Implemented now:

- Email/password auth and protected workshop onboarding
- shared Makster projects, clients and immutable revisions
- guided project flow: Project → Measurements → Modules → Materials & Hardware → True Cost → Price → Client Quote
- structured measurements with private project photos and dimension-source tracking
- expanded module library for kitchens, wardrobes, bathrooms and utility furniture
- workshop templates, favourites and recently used modules
- explicit special hardware costing for Cargo, Lift-Up/Aventos, corner mechanisms, wardrobe rails and sliding systems
- workshop Price Book with manual entry, editing, deactivation and CSV import
- Price Book readiness/onboarding with DEMO data that is never considered commercially complete
- detailed price provenance so a user can see which Price Book item, quantity and formula produced each cost
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
- Stripe Managed Payments checkout and Customer Portal foundation
- verified Stripe webhook endpoint with signature validation, idempotent billing-event journal and stale-event protection
- canonical plan grid: Free Pilot €0 / Starter €9 / Workshop €29 / Atelier €79 per month
- CI with locked install, TypeScript, multilingual PDF smoke and Next.js production build

See `ENGINEERING_RULES_0.1.2.md` for the frozen calculation assumptions of the current engineering engine. The cabinet engineering core intentionally keeps its own engine version until its formulas change.

## Currency safety

Price Book entries carry their own currency. Project editor, server-side cabinet costing, finishing/service selection, live preview and immutable quote publication all filter prices by the project currency.

Makster Quote deliberately performs no automatic FX conversion. If a workshop quotes in both CZK and EUR, it should maintain explicit CZK and EUR Price Book rows. This keeps cost calculations deterministic and prevents an exchange-rate update from silently changing a saved commercial calculation.

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

## Billing — Stripe Managed Payments

The canonical Makster Quote plan model is:

| Plan | Monthly price | Intended use |
| --- | ---: | --- |
| Free Pilot | €0 | Evaluate Quote on a real project |
| Starter | €9 | One furniture maker |
| Workshop | €29 | Workshop / small team |
| Atelier | €79 | Growing team / advanced workflow |

New paid checkouts use Stripe-hosted subscription Checkout with Managed Payments. The checkout carries `organization_id`, `user_id` and the canonical plan key in metadata, so verified subscription webhooks can map the purchase back to the Makster workspace.

`/api/stripe/webhook` forwards to the verified Stripe webhook handler. Billing writes use a server-only Supabase service-role client. Webhook handling is idempotent through `quote_billing_events`, and stale provider events cannot overwrite newer subscription state.

Existing Stripe subscribers are sent to Stripe Customer Portal instead of being allowed to create a parallel duplicate subscription.

Stripe Product/Price IDs remain external configuration. The application never invents or substitutes a commercial price. A paid plan whose canonical Stripe Price ID is not configured is shown in Billing as pending and cannot start checkout.

Historical `Founder` / `Pro` plan values and old Lemon Squeezy code remain temporary compatibility only while the existing sandbox subscription completes its lifecycle. They are not part of the new plan grid and must not be used for new checkout sessions. Final legacy-code removal belongs to the cleanup phase after Stripe regression testing.

## Product boundary

Makster Quote answers: **What will this furniture order really cost, how do we present it to the client, and did the client accept it?**

Exact CNC coordinates, connector drilling patterns, manufacturer-specific machining profiles, nesting and machine-specific output remain Makster Pro engineering responsibilities. Quote is the commercial costing layer, not a CNC release system.

The client response is a recorded acceptance/rejection event, not a qualified electronic-signature or identity-verification service.

## Environment variables

Only Supabase publishable configuration belongs in browser-visible environment variables. Supabase service-role, Resend and Stripe credentials are server-only and must never use the `NEXT_PUBLIC_` prefix.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=

RESEND_API_KEY=
QUOTE_EMAIL_FROM=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_MONTHLY_PRICE_ID=
STRIPE_WORKSHOP_MONTHLY_PRICE_ID=
STRIPE_ATELIER_MONTHLY_PRICE_ID=
```

`NEXT_PUBLIC_APP_URL` is the canonical application origin used for client quote links and Stripe redirects. The active Stripe webhook callback is:

```text
<NEXT_PUBLIC_APP_URL>/api/stripe/webhook
```

For the permanent sandbox this resolves to:

```text
https://sandbox.app.quote.maksteratelier.com/api/stripe/webhook
```

Apply all Makster Quote Supabase migrations in timestamp order before enabling production traffic, live email delivery or live billing.
