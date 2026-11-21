# Makster AI 2.7.0 — Kitchen Design Studio

Kitchen Design Studio exposes the existing 2.6.x kitchen intelligence as a working product flow rather than a standalone demo calculation.

## User flow

1. Open **Kitchen Studio**.
2. Enter room width, room depth and minimum aisle.
3. Makster generates and evaluates up to 30 candidates from the existing layout strategies.
4. The UI shows the Top 3 ready variants with PLAN / FRONT / 3D previews and transparent scoring.
5. **Choose and open as project** materializes the selected variant into the canonical ProjectModel.
6. The normal Design / Engineering / Quote / Business / Production pipeline continues from that exact revision.

## Ranking shown in Studio

- Engineering
- Ergonomics
- Manufacturing
- Utilities
- Prep surface
- Appliance access

Blocked designs cannot outrank ready designs.

## Architecture rule preserved

Kitchen Studio is not a second calculation model. Selected designs are materialized through `materializeKitchenDesignVariant()` and then compiled by the existing `MaksterEngineeringCompiler`.

## Current default Studio brief

The first UI pass generates a practical base kitchen brief with sink, dishwasher, oven/hob, drawer unit, refrigerator tall unit and projected wall layer. Exact client appliance models, materials and hardware remain explicit downstream project selections and are never invented by Studio.
