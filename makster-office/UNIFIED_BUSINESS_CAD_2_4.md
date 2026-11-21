# Makster AI 2.4 — Unified Business + CAD

## Goal

2.4 closes the branch split that happened when Visual/CAD development continued from a Core that contained Commercial 1.6 but not the later Change Intelligence 1.7 and Client Change Order 1.8 layers.

The result is one continuous model:

`Project Revision → CAD → Engineering → Production Pack → Procurement → Commercial Estimate → Client Quote → Commercial Contract → Payment Schedule → New CAD Revision → Requote → Change Impact → Change Order → Client Revision Authorization → Manufacturing Approval`

## One source of truth

- Project geometry and selections remain in canonical ProjectModel revisions.
- Visual/CAD panels and dimensions are derived projections, not a second database.
- Engineering compiles the exact Project Revision.
- Commercial estimate/quote fingerprints bind to exact revision and Engineering input checksum.
- Change Impact compares two immutable revisions and their exact technical/commercial artifacts.
- Contract points at one current agreed revision and quote.
- ClientRevisionAuthorization is immutable evidence that one changed revision was accepted.

## Business surfaces

### Quote
Creates cost estimate and customer offer from exact current revision.

### Business
- quote versions and lifecycle;
- accepted quote → Commercial Contract Record;
- payment schedule / mark paid;
- current project revision vs contracted revision;
- deterministic requote;
- Change Impact / Change Order;
- send one-time client approval token;
- client Accept / Decline;
- contract revision update and ClientRevisionAuthorization.

### Production
Manufacturing Approval is commercially gated once a contract exists. A changed revision is blocked until the client approves that exact changed revision.

## Documents

- `client-offer.html` — customer commercial offer, no internal cost/margin disclosure.
- Commercial Contract Record HTML — exact agreed revision, quote, amount and payment schedule.
- Change Order HTML — customer-safe changed items and price delta; no internal cost/profit disclosure.

## Payment invariants

- Payment template shares total 10,000 bps.
- Money uses integer minor units.
- Paid installments are frozen.
- On accepted Change Order, only unpaid installments are rebalanced.
- Contract cannot be automatically reduced below money already paid.

## Token / approval safety

- Raw Change Order approval token is returned only when sending.
- Only SHA-256 hash is retained internally.
- Public view/decision requires the token.
- Invalid or expired token returns HTTP 403.
- Acceptance fingerprint binds identity/time and exact change-order binding.

## Supabase boundary

Included prepared migrations:
- `supabase/migration_source/makster_change_intelligence_1_7.sql`
- `supabase/migration_source/makster_client_change_order_1_8.sql`

They are adapted to the current 2.x Commercial schema (`public.client_commercial_quotes`). They are **not applied to live Supabase** by this build. Runtime demo business state remains memory-backed until a production persistence adapter is wired.

## Legal boundary

Makster 2.4 generates a Commercial Contract Record, not country-specific legal advice or a complete jurisdiction-specific agreement. Production deployment needs organization-approved legal templates and, if required, an e-signature provider.
