# Makster AI 4.8.0 — Procurement Automation + RFQ Center

## Purpose

4.8 unifies the procurement capabilities that already existed in Makster Pro with the newer Owner Operations stack.

There are now two procurement lanes inside one Owner Procurement Center:

1. Outsource Production RFQ
   - cutting
   - edging
   - drilling
   - Production Pack
   - existing Procurement Intelligence / Supplier Communication modules

2. Material / Hardware RFQ
   - board materials
   - hardware
   - accessories
   - BOM shortages from active projects
   - warehouse/replenishment context

These two RFQ types deliberately remain technically different.

## BOM Shortage → Material RFQ

The Material RFQ flow is:

Engineering BOM
→ Warehouse allocation
→ hard reservations
→ uncovered shortage
→ RFQ
→ supplier invitations
→ structured supplier replies
→ quote import
→ comparison
→ Owner winner selection
→ explicit Award
→ Project Purchase Order
→ Cash Commitment

An open RFQ marks its project/SKU shortage as covered by procurement work so duplicate RFQs are not silently created.

## Supplier profile extension

Owner suppliers can now carry:

- email
- categories
- languages
- lead time
- reliability
- defect rate
- payment terms
- price index

Category filtering can restrict RFQ candidates.

## Structured material RFQ reply

Supplier invitation contains a response token and structured block:

MAKSTER MATERIAL QUOTE
RFQ_ID:
RESPONSE_TOKEN:
UNIT_PRICE:
DELIVERY_PRICE:
LEAD_DAYS:
VALID_UNTIL:
NOTE:
END MAKSTER MATERIAL QUOTE

Makster validates:

- RFQ ID
- response token
- supplier sender email
- numeric quote fields

A mismatching sender or token is classified `needs_review` and is not silently accepted.

## Quote isolation

Every imported Owner Supplier Quote can carry `rfqId`.

Material comparison uses only quotes attached to that exact RFQ.

Therefore a cheaper quote for the same SKU from an older/different RFQ cannot accidentally win a new procurement decision.

## Comparison

Material RFQ strategies:

- Optimal
- Cheapest
- Fastest

The existing Owner Supplier Intelligence is reused for real quote scoring.

The RFQ stores its recommended quote.

## Approval gates

RFQ drafts may be created automatically.

External email sending requires:
`approvedBy`

Selecting a supplier winner requires:
`approvedBy`

Selecting a winner does NOT create a Purchase Order.

The winner enters:
`winner_selected`

Only the existing explicit Supplier Quote Award action may create:

- Project Purchase Order
- committed purchasing cost
- future cash commitment

This keeps selection and spending as separate Owner decisions.

## Email providers

Material RFQs reuse the existing Makster communication provider abstraction.

Supported outbound providers:

- memory (test/demo)
- Gmail connection

Gmail sending requires an existing Gmail connection ID.

## Reminder automation

Unanswered sent RFQs can become reminder candidates.

Makster excludes suppliers that already:

- sent a quote
- declined
- otherwise replied

Reminder sending is external communication and therefore also requires Owner approval.

## Unified Procurement Center

Owner Command shows:

- BOM shortage positions
- shortages without RFQ
- open RFQs
- overdue RFQs
- quotes received
- winner-ready RFQs
- reminders due
- material/hardware RFQ rows
- existing Outsource Production RFQs

## API

GET  /api/v1/procurement-automation-center

POST /api/v1/procurement-automation/rfqs/from-shortage
POST /api/v1/procurement-automation/rfqs/:id/drafts
POST /api/v1/procurement-automation/rfqs/:id/send
POST /api/v1/procurement-automation/rfqs/:id/replies
POST /api/v1/procurement-automation/rfqs/:id/compare
POST /api/v1/procurement-automation/rfqs/:id/select-winner
POST /api/v1/procurement-automation/reminders/run

Final spending remains on the existing:
POST /api/v1/supplier-quotes/:quoteId/award

## Supabase

Prepared migration:
supabase/migration_source/makster_owner_operations_4_8.sql

Adds:

- supplier email
- supplier languages
- supplier quote RFQ lineage
- owner_material_rfqs
- owner_material_rfq_communications

Prepared schema smoke:
supabase/tests/016_owner_operations_4_8_smoke.sql
