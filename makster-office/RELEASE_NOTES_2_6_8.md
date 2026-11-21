# Makster AI 2.6.8 — Kitchen Ergonomics & Design Intelligence

## Added
- `Kitchen Ergonomics & Design Intelligence` evaluation layer on top of the existing mixed-height kitchen spatial model.
- Transparent score breakdown: safety, workflow, prep surface, appliance access, vertical reach and total score.
- Continuous preparation surface measurement between sink and cooking modules on the same run.
- Configurable sink ↔ dishwasher proximity check.
- Configurable work-triangle leg and perimeter checks based on actual sink, cooking and refrigerator coordinates from 2.6.7.
- Appliance/front opening envelopes for dishwasher, oven, refrigerator and hinged/drawer fronts.
- Blocking opposing-opening conflicts when required opening envelopes exceed the physical aisle.
- Wall-cabinet bottom height ergonomic band checks.
- Room width/depth are now propagated into `KitchenMixedHeightPlan` so ergonomic clearance checks use real plan geometry instead of inference.

## Manufacturing authority
This release does not create a second manufacturing calculator. Ergonomics is an evaluation layer. Production data remains authoritative through the existing ProjectModel → Engineering Engine → BOM / machining / CNC release pipeline.

## Rule set
`kitchen-pro-engineering-v2.6.8`

## Verification
See `RELEASE_VERIFICATION_2_6_8.txt`.
