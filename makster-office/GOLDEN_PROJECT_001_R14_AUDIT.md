# Makster Golden Project #1 — Revision 14 Audit

## Decision

Revision 14 introduces explicit `site_fit` appliance handling for the historical no-name oven and hob. Missing appliance body dimensions are no longer invented and no longer block cabinet/worktop Engineering when site-fit is intentional. Every known dimension is still validated against available geometry.

## Confirmed project facts preserved

- Lower run: 4190 mm.
- Worktop wall trim: 15 × 15 mm.
- GTV Modern Slide, concealed soft-close, 18 mm timber drawer family, nominal length 500 mm.
- Drawer box outer geometry for 600 mm carcass: 551 × 490 mm.
- Drawer sides: 18 mm particleboard; bottom: 3 mm HDF/DVP in groove.
- Shop groove profile: 3 mm width × 10 mm depth; bottom recess 13 mm.
- GTV runner and hinge installation: manual template; no invented CNC drilling.
- Sink cutout: on site.
- Hob cutout: 560 × 490 mm in ProjectModel coordinates (user source 490 × 560), on site.
- Oven opening: 560 × 580 mm; exact historical appliance depth unavailable.

## R14 site-fit policy

- `fitMode = preverified` (default): confirmed W×H×D is required before production.
- `fitMode = site_fit`: missing envelope dimensions do not block Engineering; known dimensions are still checked and an installation warning is emitted.
- `site_fit` never converts an unknown value into a guessed value.
- If a known appliance dimension exceeds available cabinet geometry, `KITCHEN_APPLIANCE_DOES_NOT_FIT` remains blocking.

## Engineering result

- Revision: 14
- Ready for Engineering production release: **TRUE**
- Engineering blockers: 0
- Engineering errors: 0
- Warnings: 14
- Info checks: 7
- Panel rows: 88
- Machining operations: 0
- `KITCHEN_APPLIANCE_SITE_FIT`: 2
- `KITCHEN_CUTOUT_ON_SITE`: 2

## Manual Production Pack result

The manual Production Pack remains **HOLD** for one separate, real reason:

- `ESTIMATED_PANEL_PARTS`: 18 panel rows are still estimated because the historical source does not contain exact drawer-front / drawer-box height geometry.

This is intentionally not bypassed. R14 solves the appliance workflow; it does not turn missing historical drawer heights into invented manufacturing dimensions.

Other non-blocking warnings include unresolved exact kitchen-leg SKU and the historical drawer-front-height default warning.

## Workshop checklist hardening

The manual workshop checklist now explicitly lists:

- GTV runner manual-template operations;
- GTV hinge manual-template operations;
- sink cutout on site;
- hob cutout on site;
- oven site-fit verification;
- hob site-fit verification.

## Regression

Full automated suite after the R14 patch: **179 / 179 PASS**.

## Acceptance conclusion

Golden Project #1 has completed its purpose as a hardening project: it exposed and fixed GTV drawer geometry, grooved bottoms, manual-template hardware, on-site worktop cutouts, wall trim and no-name appliance site-fit. The remaining Production Pack HOLD is a safe historical-data limitation, not an unresolved engine defect.
