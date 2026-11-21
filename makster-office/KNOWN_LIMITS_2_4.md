# Makster AI 2.4 — Known Limits

2.4 is the first unified Visual/CAD + Business branch. It proves the entire revision-bound workflow but is not yet a declaration of full production deployment readiness.

## Persistence
- Project revisions can use the existing repository abstraction.
- The new 1.7/1.8 business runtime objects (quote contexts/lineage, contracts, Change Orders, client authorizations) are currently held in Core memory maps.
- Prepared Supabase migrations are included and adapted to the current Commercial schema, but they were not applied to live Supabase and server-side persistence adapters for these records are not wired yet.
- Restarting memory-mode Core clears demo business state.

## Legal documents
- `client-offer.html`, Commercial Contract Record HTML and Change Order HTML are customer-safe revision-bound commercial records.
- The Commercial Contract Record is not a complete Czech/EU/German or other jurisdiction-specific legal agreement.
- Legal clauses, warranty/consumer terms, privacy language and e-signature must come from an organization-approved template/integration before legal production use.

## Pricing
- `TEST_ONLY_atelier_demo_eur_v1` is test data only.
- Real Makster Atelier cost books, supplier prices, tax policy and margin rules must be explicitly configured; the engine will HOLD rather than invent missing values.

## Visual / Engineering
- 2.3 CAD limits remain: first-class L-layout is two Engineering-backed rectangular objects, not a one-piece special corner carcass.
- Free-form polygon cabinets, angled panels and deeper kitchen-specific rule packs remain future Engineering work.
- 3D remains lightweight axonometric.

## Validation before broad beta
Run 20–30 anonymized real Makster Atelier jobs through:
`CAD → Engineering → Quote → Contract → Change → Change Order → Production`
and target zero critical dimensional or revision-authorization errors.
