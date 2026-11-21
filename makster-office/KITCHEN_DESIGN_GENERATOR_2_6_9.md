# Makster AI 2.6.9 — Kitchen Design Generator & Variant Ranking

## Purpose
2.6.9 links the existing Kitchen Auto Layout Optimizer, Mixed Height & Appliance Layout Engine, and Kitchen Ergonomics & Design Intelligence into one transparent design-generation pipeline.

## Pipeline
1. Generate base layout candidates by layout kind and assignment strategy.
2. Materialize mixed-height variants with real tall-module placement.
3. Deduplicate geometrically equivalent variants.
4. Evaluate blocking room/layout constraints.
5. Evaluate real mixed-height appliance geometry and work triangle.
6. Evaluate ergonomics, prep surface and opening access.
7. Score manufacturing rationality and utilities.
8. Sort READY designs before rejected designs.
9. Return Top N ready designs (Top 3 by default) with score breakdown and reasons.

## Ranking axes
- Engineering
- Ergonomics
- Manufacturing
- Utilities
- Prep surface
- Appliance access

Weights are normalized and configurable. Blocking geometry or ergonomic conflicts cannot be compensated for by a high cosmetic score: rejected variants are always ranked after READY variants.

## Variant generation
The engine uses real layout strategies and, when tall positions are not explicitly fixed, real START/END tall-module placements. It does not create random visual permutations. The generation cap is hard-limited to 30 variants.

## Output
Each design variant includes:
- source layout candidate;
- mixed-height spatial plan;
- ergonomics result;
- manufacturing-facing technical filler data;
- six-axis score breakdown;
- total score;
- readiness state;
- human-readable reasons.

The default shortlist is Top 3 READY designs. If fewer than 3 pass blocking rules, the engine returns only the valid designs and reports the shortage.
