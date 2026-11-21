# Makster 1.6 — Commercial & Quote Engine

## Purpose

Makster 1.6 converts one exact Project Revision into a reproducible internal cost estimate and a client-facing commercial offer without duplicating numbers between engineering, procurement and sales.

## Trust chain

`Project Revision → Engineering BOM → Production Pack → Pricing Profile / Supplier Quote → Commercial Estimate → Client Quote → Lifecycle Status`

The estimate is bound to:
- `projectId` + `revision`
- Engineering input checksum
- optional Production Pack ID + manifest fingerprint
- Pricing Profile ID + SHA-256 fingerprint

Any meaningful pricing-profile or revision change produces a different estimate fingerprint.

## Money model

All monetary values inside the engine use integer minor units. For EUR, `428735` means EUR 4,287.35. Percentage policies use integer basis points (`10000 = 100%`). Floating-point currency arithmetic is not used for totals.

## Cost categories

- material
- edge
- hardware
- external service / supplier quote
- workshop labor
- transport
- installation
- overhead
- other

## Panel pricing

Panel BOM rows are aggregated by `materialSelectionId + thickness` before commercial sheet rounding. A price rule can be:
- `per_m2`
- `per_sheet` with sheet dimensions and explicit commercial waste BPS

This is a commercial estimate, not a nesting optimizer. A future sheet optimizer can replace commercial waste assumptions with actual optimized sheet count without changing the quote contract.

## Price trust

Missing material, edge or hardware prices are blockers. The engine never substitutes a guessed market average.

External supplier quotes enter as explicit `supplier_quote` cost lines with `quoteId` provenance.

## Pricing policy

The configured sequence is:
1. direct costs
2. overhead on direct costs
3. markup on full cost
4. optional commercial rounding
5. discount
6. net sales
7. configured tax
8. gross client total
9. profit = net sales - full cost
10. margin = profit / net sales

Tax rate is a pricing-profile input. Makster 1.6 does not encode jurisdiction-specific tax law.

## Internal vs client output

Internal artifacts:
- `cost-estimate.json`
- `cost-breakdown.csv`

Client artifacts:
- `client-quote.json`
- `client-offer.html`

The client artifacts do not contain `totalCostMinor`, `profitMinor`, internal cost lines or margin data.

## Quote versioning

Quote documents are immutable and revision-bound. Lifecycle (`draft/sent/accepted/rejected/expired/superseded`) is tracked separately so changing status does not rewrite the quoted commercial document.

## API

- `POST /api/v1/projects/:projectId/commercial/estimate-preview`
- `POST /api/v1/projects/:projectId/commercial/quotes`
- `GET /api/v1/commercial/quotes/:quoteId`
- `POST /api/v1/commercial/quotes/:quoteId/status`
- `GET /api/v1/commercial/quotes/:quoteId/files/:fileName`

## Demo boundary

`TEST_ONLY_atelier_demo_eur_v1` exists only to prove the engine end-to-end. It is not Makster Atelier's live price list and must never be used for a real customer quote.
