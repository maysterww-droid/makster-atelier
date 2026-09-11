# Makster Quote 0.1 — Commercial Document 0.1.4

Makster Quote is the quotation-first product in the Makster ecosystem.

## Current milestone

0.1.4 turns the live commercial calculation into a versioned business document workflow.

Implemented now:

- Email/password auth and protected workshop onboarding
- shared Makster projects, clients and revisions
- workshop Price Book
- deterministic Engineering Core for `B-Door`, `B-Drawer` and generic cabinets
- part, edge, hardware, operation and labour costing
- project-level delivery, installation and other fixed per-order costs
- true cost → target-margin price → tax → payable total
- payment deposit percentage and calculated deposit amount
- production lead-time text
- payment terms and warranty/conditions
- organization-level document/company details under `organizations.settings.quoteBrand`
- client-document language: RU / CS / DE / PL / EN
- live quotation preview for work in progress
- immutable published quote versions using the shared `commercial_estimates` and `client_commercial_quotes` tables
- append-only quote status history: approved / sent / accepted / rejected / expired
- server-generated A4 PDF download from the immutable quote snapshot
- embedded Unicode font support for Russian and Central-European languages
- CI PDF smoke test that creates a real PDF buffer before the production build
- explicit blocking of quote publication while cabinet pricing is incomplete

See `ENGINEERING_RULES_0.1.2.md` for the frozen cabinet-calculation assumptions.

## Published quote integrity

A published 0.1.4 quote is a snapshot, not a view over mutable project data. It stores the client, supplier details, project revision, module list, selected extras, commercial terms and client-visible amounts at publication time. Later project or company-setting changes do not rewrite the historical version.

The underlying internal estimate snapshot separately stores cost and margin data. Client-facing PDF generation reads only the immutable client quote snapshot and does not expose internal cost or profit.

RLS and relationship checks protect organization → project → revision → estimate → quote → status-event integrity. Quote publishing is limited to owner/admin/technologist roles; status events can also be recorded by sales. Terminal accepted/rejected/expired quotes cannot be moved back to an active status through the normal Quote action.

## PDF

`/projects/[projectId]/quote/[quoteId]/pdf` generates a real PDF response on the server. PDF generation uses the pinned `pdfmake` dependency and embedded Roboto VFS fonts. CI runs a multilingual PDF smoke test containing Russian, Czech, German and Polish text.

Browser Print / Save PDF remains available on the live preview, but published versions use the server-generated immutable PDF flow.

## Product boundary

Makster Quote answers: **What will this furniture order really cost, and what should we quote?**

CRM, warehouse, CNC release, production scheduling, accounting and AI Office remain in the wider Makster platform. Quote reuses shared business records instead of creating parallel clients/projects.

Exact CNC coordinates, connector drilling patterns, manufacturer-specific manufacturing profiles, nesting and machine-specific output remain later Makster Pro engineering layers.

## Languages

Owner-testing UI is Russian-first. Client document language is independent and currently supports RU / CS / DE / PL / EN.

## Environment variables

Use only the publishable Supabase key in browser-visible environment variables. Never expose a secret/service-role key to the client.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Direct email delivery is not enabled in 0.1.4 yet; the generated PDF can be downloaded and sent manually. Email-provider integration should stay server-side and will be a later commercial step.
