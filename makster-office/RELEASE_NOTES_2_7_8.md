# Makster AI 2.7.8 — Hardware & Appliance Production Intelligence

## Purpose

2.7.8 makes approved catalog assignments affect production release, not just catalog display.

## Hardware production intelligence

For each assigned catalog-backed hardware selection Makster now decides:

- READY — trusted drilling profile exists;
- MANUAL_REQUIRED — automatic CNC is not authorized, but an explicit manual_template/manual_measure method is approved;
- VERIFICATION_REQUIRED — SKU is known, but neither trusted drilling data nor an explicit manual method is approved;
- BLOCKED — assigned catalog record is missing.

When drilling is not authorized and no manual method is approved:
- Engineering receives a blocking issue;
- CNC release receives a blocker;
- the UI receives a concrete action telling the technologist what must be resolved.

Example:
Blum MOVENTO 760H 550 can remain a valid selected SKU for BOM/planning, while CNC stays blocked until exact drilling data is imported or a manual machining method is explicitly approved.

## Appliance production intelligence

Catalog-backed appliances now produce installation actions.

Makster checks:
- confirmed W×H×D installation envelope;
- catalog compatibility against that envelope;
- manufacturer ventilation requirement when normalized;
- site_fit mode.

New ProjectModel field:
- KitchenApplianceSpec.verifiedVentilationAreaCm2

Example:
Liebherr IRBd 5120 requires at least 200 cm² ventilation in the current normalized catalog record.
If the project has no confirmed ventilation area, production is HOLD.
Once verifiedVentilationAreaCm2 >= 200, that blocker disappears.

## Engineering output

EngineeringCompileResult now includes:
- catalogTraceability[]
- productionIntelligenceActions[]

The Engineering UI shows both Catalog Traceability and Production Intelligence.

## Release gate

Catalog production intelligence is merged into:
- Engineering issues
- readyForProduction
- CNC blockers
- cncReady

This means a known brand/model does not bypass production safety.
