# Release notes — Makster AI 2.6.6

## Kitchen Auto Layout Optimizer
- Added `packages/engineering-engine/src/kitchen-auto-layout-optimizer.ts`.
- Generates and ranks multiple kitchen layout candidates.
- Supports straight, L, parallel, U and island layout families.
- Adds compact, utility-affinity and distributed placement strategies.
- Adds explicit score breakdown and human-readable ranking reasons.
- Integrates 2.6.5 obstacle, opening-zone and corner constraints.
- Penalizes technical/site-fit filler instead of silently stretching cabinet carcasses.
- Never recommends a blocked candidate when a ready candidate exists.
- Returns no recommendation when every candidate is blocked.

## Regression hardening
- Updated Kitchen Engineering ruleset id to `kitchen-pro-engineering-v2.6.6`.
- Fixed two legacy test fixture paths so compiled tests read Golden Project #1 from the source fixture directory instead of a non-existent `dist/.../examples` directory.
- Fixed a legacy branded-mm test fixture type so full strict TypeScript checking can run.
- Added five Kitchen Auto Layout Optimizer regression scenarios.

## Known scope boundary
2.6.6 optimizes base-run footprints. Automatic mixed base/tall/wall placement, especially tall refrigerator positioning, remains out of scope. The optimizer explicitly leaves work-triangle scoring neutral when the complete trio is not represented.
