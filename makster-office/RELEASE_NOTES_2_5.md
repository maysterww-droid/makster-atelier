# Release Notes — Makster AI 2.5 Pro Engineering Merge

## Added
- Kitchen Engineering ruleset `kitchen-pro-engineering-v2.5`.
- Base / wall / tall kitchen section construction.
- Kitchen functions for storage, drawers, sink, hob, oven, dishwasher, fridge, hood, microwave, pantry and open modules.
- Worktop physical parts and worktop cutout machining records.
- Plinth and kitchen-leg requirements.
- Appliance installation-envelope fit validation.
- Kitchen-specific material role assignments.
- Visual commands: configure kitchen run, edit kitchen module, assign drawer system, assign appliance, edit cutout, assign kitchen materials, edit kitchen front.
- Visual Kitchen Pro 2.5 Inspector.
- Single and paired-double kitchen hinged fronts.
- Demo commercial cost entries for 2.5 worktop and leg selections (TEST ONLY).
- Control kitchen fixture and kitchen CLI scripts.

## Preserved
- one canonical ProjectModel;
- immutable revisions and expectedRevision concurrency;
- Engineering 0.7 manufacturing-data trust;
- Production Pack / outsource route separation;
- Commercial 1.6, Change Intelligence 1.7, Contract / Change Order 1.8;
- existing Visual/CAD room, snapping, L-layout and business features.

## Trust hardening
A Visual command is forbidden from promoting a kitchen cutout to CNC-verified status. This requires manufacturing-trust evidence. Invalid role assignments and unknown runner/leg selections are also rejected server-side.

## Verified
- TypeScript strict build PASS.
- app.js syntax PASS.
- 150/150 tests PASS.
- HTTP end-to-end PASS 23/23.
- Manual kitchen Production Pack READY.
- Outsource cutting+edging READY.
- Outsource drilling correctly HOLD without trusted machining.
