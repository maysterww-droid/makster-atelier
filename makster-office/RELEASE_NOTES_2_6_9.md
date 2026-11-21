# Release Notes — Makster AI 2.6.9

## Kitchen Design Generator & Variant Ranking

Added `generateAndRankKitchenDesigns()` as the orchestration layer for kitchen design generation.

### New
- Up to 30 evaluated design variants.
- Default Top 3 ready-design shortlist.
- Mixed-height start/end tall-module variants when position is not fixed.
- Deduplication of equivalent generated geometries.
- Transparent score breakdown: Engineering, Ergonomics, Manufacturing, Utilities, Prep Surface, Appliance Access.
- READY-first ranking: a blocked design cannot outrank a technically valid design.
- Human-readable ranking reasons per candidate.
- Configurable normalized ranking weights.

### Integrity
No second manufacturing engine was introduced. 2.6.9 composes the existing layout, constraint, mixed-height, ergonomics and Engineering Engine layers.

### Ruleset
`kitchen-pro-engineering-v2.6.9`
