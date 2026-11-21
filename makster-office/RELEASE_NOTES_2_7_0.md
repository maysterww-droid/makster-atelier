# Release notes — Makster AI 2.7.0

## Kitchen Design Studio

- New **Kitchen Studio** product tab in the web application.
- Room inputs: width, depth, minimum aisle.
- Generates up to 30 design candidates and displays Top 3 ready designs.
- In-card PLAN / FRONT / 3D preview modes.
- Transparent six-part score breakdown.
- Recommended candidate marker and explanation.
- Selected candidate can be opened as a normal Makster project revision.
- New API: `POST /api/v1/kitchen-design-studio/generate`.
- New API: `POST /api/v1/projects/:id/kitchen-design-studio/apply`.
- New `materializeKitchenDesignVariant()` bridge into canonical ProjectModel.
- Kitchen ruleset bumped to `kitchen-pro-engineering-v2.7.0`.

## Regression hardening

Two old 2.6.8 TypeScript test defects were corrected so the full suite can compile under `exactOptionalPropertyTypes`.

## Important production truth

A Studio design can be geometrically READY while the resulting Engineering artifact remains production HOLD until real material/hardware/appliance data required by the existing release gates is selected or verified. 2.7.0 intentionally preserves that safety boundary.
