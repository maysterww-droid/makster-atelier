# Makster Quote 0.1 — Commercial Quote 0.1.3

Makster Quote is the quotation-first product in the Makster ecosystem.

## Current milestone

0.1.3 combines the deterministic Engineering Core with a project-level commercial calculation and a client-facing printable quotation.

Implemented now:

- Email/password auth and protected workshop onboarding
- shared Makster projects and revision 1 bootstrap
- workshop Price Book
- persisted Quote cabinets
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
- project-level delivery, installation and other fixed per-order costs
- project direct cost → overhead → true cost → target-margin price → tax → payable total
- client selection or quick client creation
- stable quotation issue date and configurable validity period
- independent client-document language: RU / CS / DE / PL / EN
- clean client quotation page with browser Print / Save PDF flow
- draft marking while any saved cabinet is missing required prices
- explicit incomplete-calculation warnings instead of fabricated values

See `ENGINEERING_RULES_0.1.2.md` for the frozen cabinet-calculation assumptions.

## Product boundary

Makster Quote answers: **What will this furniture order really cost, and what should we quote?**

CRM, warehouse, CNC release, production scheduling, accounting and AI Office remain in the wider Makster platform. Quote reuses shared clients/projects rather than creating parallel business records.

## Shared Makster backend

Environment: `Makster-Staging` (Supabase, EU Central).

Quote reuses existing shared tables including `organizations`, `organization_members`, `clients`, `projects` and `project_revisions`, plus Quote-specific `quote_cabinets`, `quote_price_book_items` and `quote_subscriptions`.

Engineering output remains in the existing JSON fields on `quote_cabinets`; project-level commercial options are stored under `projects.settings.quoteCommercial`. No duplicate project or client tables are introduced.

All exposed Quote data remains protected by RLS and organization membership.

## Calculation principles

Money is stored/calculated in minor currency units as integers. Engineering and commercial calculations are deterministic and never delegated to an LLM.

Core selling-price formula:

`selling_price = true_cost / (1 - target_margin)`

Margin and markup remain distinct values.

Sheet materials are allocated by used area plus the Price Book waste percentage. Whole-sheet nesting and reusable offcut optimisation are later production stages.

Delivery, installation and other project extras are intentionally accepted only from Price Book entries using unit `job`, preventing an hourly or linear rate from being silently treated as one fixed project charge.

## PDF status

0.1.3 provides a print-optimised A4 quotation page and invokes the browser Print dialog, where the user can print or save as PDF. Direct server-generated PDF files and email delivery remain future steps.

## Not yet CNC-ready

The generated part list is commercial engineering, not a drilling/CNC release. Exact groove reference planes, connector drilling patterns, Blum/Kesseböhmer/Hettich manufacturing profiles, nesting and machine-specific output remain future engineering layers.

## Languages

Owner-testing UI is Russian-first. Client document language is independent and currently supports RU / CS / DE / PL / EN.

## Environment variables

Use only the publishable Supabase key in browser-visible environment variables. Never expose a secret/service-role key to the client.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```
