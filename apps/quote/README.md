# Makster Quote 0.1.1

Makster Quote is the quotation-first product in the Makster ecosystem.

## Product boundary

Makster Quote answers: **What will this cabinet/furniture order really cost, and what should we quote?**

It intentionally does not own CRM, warehouse, CNC, production scheduling, accounting, or AI Office. Those remain in the wider Makster platform.

## Shared Makster backend

Environment: `Makster-Staging` (Supabase, EU Central).

Makster Quote reuses the existing shared tables:

- `organizations`
- `organization_members`
- `clients`
- `projects`
- `project_revisions`
- `commercial_pricing_profiles`
- `commercial_estimates`
- `commercial_estimate_lines`

Quote-specific tables:

- `quote_cabinets`
- `quote_price_book_items`
- `quote_subscriptions`

All exposed Quote tables use RLS. Organization membership is the tenant boundary. Quote cabinet foreign keys include the organization together with project/revision IDs so cross-workshop references are rejected by the database.

## MQ 0.1.1 implemented

- Email/password sign-in and signup flow
- Auth confirmation callback
- First-run workshop creation guarded by RLS
- Free subscription bootstrap
- Real dashboard using shared Makster projects
- Real project creation with revision 1
- Price Book creation and retrieval
- Persisted Quote cabinets
- Deterministic live cost preview using Price Book values
- No invented/demo prices in real projects
- Russian owner-testing interface
- Localization shell: RU / EN fallback / CS / DE / PL
- CI: TypeScript check and Next.js production build
- Locked npm dependency graph

## Current engineering status

`src/lib/engineering.ts` is deliberately an **MQ 0.1.1 engineering preview**. It supports the first cabinet cost loop for `b-door`, `b-drawer`, and `generic`, but it is not yet the final manufacturing geometry engine.

The UI explicitly warns that production operations, delivery, and installation are not yet included in the current preview path. We prefer an incomplete but honest result over a fabricated complete price.

## Calculation principles

All money is stored/calculated in minor currency units as integers. Engineering and commercial calculations are deterministic and never delegated to an LLM.

Core formula:

`selling_price = true_cost / (1 - target_margin)`

Margin and markup are always distinct values.

## Languages

- `ru` — Russian; owner-testing default
- `en` — English; system fallback
- `cs` — Czech
- `de` — German
- `pl` — Polish

The UI language and client-document language must remain independent.

## Environment variables

Use only the publishable Supabase key in browser-visible environment variables. Never expose a Supabase secret/service-role key to the client.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Lemon Squeezy credentials remain future server-only variables and billing is not part of MQ 0.1.1 yet.
