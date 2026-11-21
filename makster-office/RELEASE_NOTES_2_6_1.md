# Release Notes — Makster AI 2.6.1 Golden Project Hardening

2.6.1 hardens the Kitchen/Engineering layer using Golden Project #1, a real Makster Atelier kitchen.

## Added
- multi-appliance kitchen modules (`appliances[]`), including oven + hob in one 600 mm zone;
- confirmed-envelope production gate for appliances;
- explicit hob cutout requirement;
- first-class worktop wall-side trim/upstand;
- per-module kitchen back-panel mode;
- wall-cabinet hanger selection/count;
- Visual CAD commands/UI for secondary appliance, wall trim, back mode and hangers;
- Golden Project #1 R4 fixture and dedicated regression tests.

## Trust behavior retained
- selected third-party GTV hardware remains GTV in BOM;
- no verified profile = no released drawer dimensions/drilling;
- no Blum machining is substituted for GTV;
- unknown appliance/cutout/trim data is blocking;
- CNC verification still cannot be self-asserted from Visual CAD.

## Persistence
Persistent Unified Core 2.6 is unchanged. Makster-Staging already passed real restart acceptance for Contract / Change Order / Authorization.
No new Supabase migration is required for 2.6.1.
