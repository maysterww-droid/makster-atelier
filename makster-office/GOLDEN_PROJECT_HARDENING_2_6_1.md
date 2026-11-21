# Makster AI 2.6.1 — Golden Project Hardening

## Goal
2.6.1 is the first release hardened against a real Makster Atelier kitchen instead of only synthetic fixtures.

Golden Project #1 source: straight kitchen, owner-confirmed lower run 4190 mm.

## Implemented from the real project

### 1. Third-party hardware is real BOM data, not a Blum substitute
- GTV soft-close drawer runners remain selected GTV hardware in BOM.
- GTV soft-close hinges remain selected GTV hardware in BOM.
- If exact GTV technical/drilling profile is absent, Engineering emits `DRAWER_RUNNER_PROFILE_UNVERIFIED` / `HINGE_PROFILE_UNVERIFIED` and keeps Production HOLD.
- No Blum drilling is generated for unknown GTV hardware.

### 2. Appliance production gate is stricter
A kitchen appliance now needs a confirmed W×H×D installation envelope before Production READY.
`observed`, `estimated`, unknown or partially-known dimensions are not treated as production truth.

### 3. Multiple appliances in one cabinet zone
`KitchenModuleSpec.appliances[]` allows one section to contain multiple appliance roles.
Golden Project #1 now represents the 600 mm zone as:
- oven — cabinet installation;
- hob — worktop installation.

The legacy single `appliance` field remains readable for backward compatibility.

### 4. Hob and sink cutouts are separate required facts
A combined oven+hob cabinet requires a real `hob` worktop cutout.
A sink cabinet requires a real `sink` worktop cutout.
Missing cutout geometry blocks production instead of being inferred.

### 5. Wall-side worktop plinth / upstand
`KitchenWorktopSpec.wallTrim` is a first-class worktop accessory with:
- material;
- height;
- depth/thickness;
- physical BOM parts.

If the trim exists but its dimensions are unknown, Engineering emits one run-level `KITCHEN_WALL_TRIM_DIMENSIONS_REQUIRED` blocker.

### 6. Wall cabinet grooved back + hangers
Kitchen modules can override back-panel construction with `backPanelMode`.
`groove` reuses the trusted existing back-groove machining engine, but exact inset/depth/clearance must be confirmed.
Wall cabinet hangers can be selected and counted in BOM via `wallHangerHardwareSelectionId` / `wallHangerCount`.
Unknown GTV hanger drilling stays HOLD.

## Visual CAD
Kitchen Inspector 2.6.1 now exposes:
- per-module back-panel mode;
- wall hanger selection/count;
- appliance installation mode;
- append a second appliance to the same section;
- wall-side worktop trim.

All edits still go through typed Visual Commands → Project ChangeSet → immutable Revision.

## Golden Project #1 R4 result
- lower run: 4190 mm confirmed;
- geometry mismatch 3590/4190 is removed from production truth;
- panel parts: 46;
- Production READY: false;
- blocking checks: 10;
- no invented CNC/drilling operations.

Current blockers are real missing inputs:
- 2 × GTV runner technical profile;
- 3 × GTV hinge technical profile;
- sink cutout geometry;
- oven confirmed installation envelope;
- hob confirmed installation envelope;
- hob cutout geometry;
- wall-side trim dimensions.

This increase in blocker count vs earlier revisions is intentional: 2.6.1 models previously-hidden unknowns explicitly instead of silently collapsing them.
