# Makster AI 2.6.6 — Kitchen Auto Layout Optimizer

## Purpose
2.6.6 adds a deterministic layout-ranking layer above Kitchen Layout Planner 2.6.4 and Kitchen Constraint & Corner Engine 2.6.5. It does not replace Engineering Engine and it does not fabricate manufacturing geometry.

## Candidate generation
For each allowed layout kind (`straight`, `l_shape`, `parallel`, `u_shape`, `island`) the optimizer can generate distinct requirement-placement strategies:
- `compact` — keeps unassigned functional modules together on the primary wall run;
- `utility_affinity` — prefers a run that already has the declared service type required by that module;
- `distributed` — spreads unassigned functional modules across available wall runs.
Duplicate candidates are removed before ranking.

## Ranking
Every candidate exposes a transparent score breakdown (0–100):
- feasibility / blocking geometry;
- aisle and clearance quality;
- declared utility proximity;
- technical/site-fit filler usage;
- work-triangle slot (neutral while the complete sink/cooking/fridge trio is not represented in the generated base-run footprint);
- production/layout simplicity.

Ready layouts are always ranked before blocked layouts. A blocked layout cannot win solely because of a high cosmetic score.

## Safety / trust rules
- Obstacles, door opening zones and corner constraints come from the existing 2.6.5 Constraint Engine.
- Unknown utility coordinates are not invented.
- Standard cabinet widths are preserved; remaining millimetres become explicit technical/site-fit filler.
- `recommended` is omitted when no candidate passes blocking constraints.
- Work-triangle distances are not fabricated when a refrigerator footprint is not part of the generated plan.

## Current limitation
The current Layout Planner composes base runs. Automatic mixed base/tall/wall footprint placement (including an automatically positioned tall refrigerator) is not yet part of 2.6.6. Therefore the work-triangle field remains explicitly `available:false` rather than inventing a refrigerator position. This is the next required layer before using triangle distance as an active ranking factor.
