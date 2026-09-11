# Makster Quote 0.1 Core

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

Migration `20260911012543_makster_quote_core_0_1` adds only:

- `quote_cabinets`
- `quote_price_book_items`
- `quote_subscriptions`

All new exposed tables have RLS enabled. Organization membership controls tenant isolation. Subscription writes are server-side only.

## Launch languages

- `ru` — Russian; default for owner testing
- `en` — English; system fallback
- `cs` — Czech
- `de` — German
- `pl` — Polish

The UI language and client-document language must remain independent. A user may work in Russian while generating a client quote in German, Czech, Polish, or English.

## Calculation principles

All money is stored in minor currency units as integers. Engineering and commercial calculations are deterministic and never delegated to an LLM.

Core formula:

`selling_price = true_cost / (1 - target_margin)`

Margin and markup are always shown as distinct values.

## Current milestone

`MQ 0.1.0 Core`

1. Shared Supabase integration
2. Quote-specific schema
3. Deterministic costing engine
4. Five-language localization shell
5. First cabinet editor/dashboard shell

## Environment variables

Use a publishable Supabase key in the browser. Never expose a Supabase secret/service-role key to the client.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Lemon Squeezy credentials will be added later to server-only environment variables when billing is enabled.
