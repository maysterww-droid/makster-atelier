# Commercial Pricing Trust — Makster 1.6

Makster must be able to answer: **where did this price come from?**

Allowed sources:
- `price_catalog` — organization-approved material/hardware catalog
- `supplier_quote` — exact external supplier quote
- `manual` — explicit owner/technologist input
- `derived` — deterministic formula such as overhead
- `engineering` — engineering-derived quantity

## Non-negotiable rules

1. No LLM-generated production price is accepted as fact.
2. Missing price = blocker, not guessed fallback.
3. Currency mismatch between project and pricing profile = error.
4. Pricing profiles are versioned and fingerprinted.
5. Internal cost/margin data is not present in client offer files.
6. Client quote is bound to estimate fingerprint and Project Revision.
7. Supplier-quote cost line preserves supplier and quote identifiers.
8. Percentage policy uses basis points; money uses integer minor units.
9. Tax is configurable input, not legal/tax advice or a jurisdiction default.
10. A price-list change requires a new pricing-profile version and therefore a new estimate fingerprint.

## Supabase access model

Prepared 1.6 migration keeps internal pricing/estimate rows restricted to `owner/admin/technologist` organization roles. Client quote documents can be read by active organization members, while creation/mutation remains server-side. Snapshot estimate and quote documents are immutable; lifecycle status is append-only event data.
