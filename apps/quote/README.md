# Makster Quote 0.1 — Engineering Core 0.1.2

Makster Quote is the quotation-first product in the Makster ecosystem.

## Current milestone

Engineering Core 0.1.2 replaces the first approximate cabinet-area preview with deterministic cabinet parts, hardware and production-operation costing.

Implemented now:

- Email/password auth and protected workshop onboarding
- Shared Makster projects and revision 1 bootstrap
- Workshop Price Book
- Persisted Quote cabinets
- `B-Door`, `B-Drawer` and generic cabinet rules
- deterministic part list with dimensions and quantities
- back panel modes: groove / overlay / none
- door and drawer-front gap geometry
- carcass and optional front edge-band metres
- hinge quantities by door height
- drawer-system quantities
- automatic production operations from typed Price Book rows
- direct labour hours and hourly rate
- module true cost, selling price, profit and margin
- saved-project cabinet totals
- explicit incomplete-calculation warnings when a required price is missing
- Russian owner-testing UI with EN fallback architecture

See `ENGINEERING_RULES_0.1.2.md` for the frozen calculation assumptions.

## Product boundary

Makster Quote answers: **What will this furniture order really cost, and what should we quote?**

CRM, warehouse, CNC release, production scheduling, accounting and AI Office remain in the wider Makster platform. Quote can consume those capabilities later without duplicating them.

## Shared Makster backend

Environment: `Makster-Staging` (Supabase, EU Central).

Quote reuses existing shared tables including `organizations`, `organization_members`, `projects` and `project_revisions`, plus Quote-specific `quote_cabinets`, `quote_price_book_items` and `quote_subscriptions`.

Engineering 0.1.2 does not require a new table: the existing JSON fields on `quote_cabinets` store construction rules, material/hardware references, generated parts, operations and deterministic cost output.

All exposed Quote tables remain protected by RLS and organization membership.

## Calculation principles

Money is stored/calculated in minor currency units as integers. Engineering and commercial calculations are deterministic and never delegated to an LLM.

Core selling-price formula:

`selling_price = true_cost / (1 - target_margin)`

Margin and markup remain distinct values.

For sheet materials, Engineering 0.1.2 allocates material cost by used area plus the Price Book waste percentage. Whole-sheet nesting and reusable offcut optimisation are later production stages.

## Not yet CNC-ready

The generated part list is commercial engineering, not a drilling/CNC release. In particular, groove reference planes, connector drilling patterns, Blum/Kesseböhmer/Hettich manufacturing profiles and machine-specific output remain future engineering layers.

Delivery and installation are project-level commercial costs and are not allocated to individual cabinets yet.

## Languages

Launch architecture: RU / EN fallback / CS / DE / PL. UI language and client-document language remain independent.

## Environment variables

Use only the publishable Supabase key in browser-visible environment variables. Never expose a secret/service-role key to the client.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```
