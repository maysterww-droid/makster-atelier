# Makster AI 2.8.2 — Appliance Studio

## Product principle

Appliances are furniture-engineering data first.
Selling/procuring appliances is optional.

Appliance Studio distinguishes:
- customer_supplied
- makster_supplied
- undecided

Commercial information never replaces engineering geometry.

## Engineering view

For each model Makster shows:
- manufacturer/model
- type
- installation mode
- trust/source
- niche width/height/depth
- ventilation requirement
- fit policy
- source/drawing reference
- price segment when available

## Optional commercial layer

When `makster_supplied` is selected, Appliance Studio exposes:
- price tier: budget / mid / premium / unknown
- verified price guidance if present
- project-level procurement intent

Current bundled appliance records do not invent market prices.
Price tier remains UNKNOWN unless a reviewed catalog/import record provides it.

## Sink & hob policy

Makster now treats sink/hob cutouts as ON-SITE by default when cutout.execution is unspecified.

Workshop/CNC sink/hob cutout requires:
- explicit execution='workshop'
- verifiedForCnc=true

This preserves accurate drawings while matching normal installation practice.

## ProjectModel additions

KitchenApplianceSpec:
- procurementMode
- priceTier
- pricing
- cutoutExecution
- sink kind support
- sink_cutout installation support

Approved Appliance Studio assignment stores procurement intent in the new Project Revision.

## UI

New separate Appliance Studio tab.
Hardware Studio remains separate.
Catalog Admin remains for import/review/promotion.
