# Makster AI 5.2.0 — Live Growth Adapter Layer + Sales CRM + Revenue Attribution

## Delivered
- Sales CRM pipeline: NEW → CONTACTED → QUALIFIED → MEASUREMENT BOOKED → PROPOSAL → NEGOTIATION → WON / LOST.
- Stage probability and weighted sales forecast.
- Next follow-up tracking and overdue follow-up count.
- Lost reason is mandatory for LOST.
- Lead → Makster Project bridge retained.
- Project contract revenue reconciles back to the originating marketing lead.
- Actual project profit field is prepared when project actual cost is available.
- Campaign → provider campaign mapping.
- Normalized provider sync ingress for Google Ads, Meta Ads and TikTok Ads.
- Provider connection registry.
- Sync history snapshots.
- AI Office UI now shows weighted pipeline, actual project revenue/profit and Live Growth Connections.
- Supabase migration for provider connections and sync snapshots.

## Important live-provider boundary
5.2 contains the production-shaped adapter/data boundary, but no provider account credentials were supplied in this build.
Therefore Google/Meta/TikTok are reported as DISCONNECTED/CONFIGURED rather than falsely CONNECTED.
Real OAuth/account authorization and provider-specific API clients are the next deployment step.
No autonomous ad spend is enabled.

## Verification
- strict Owner/Office TypeScript compile: PASS
- Core API structural compile: PASS (archive still lacks @types/node)
- runtime provider mapping + normalized sync: PASS
- CRM stage transition: PASS
- weighted pipeline: PASS
- 5.2 tests: 6/6
- full regression: 54/54
