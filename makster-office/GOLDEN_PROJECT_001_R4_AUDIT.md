# Makster Golden Project #1 — Revision 4 Audit (Makster AI 2.6.1)

## Confirmed geometry
- Lower kitchen run: **4190 mm** (owner-confirmed).
- Module chain: 600 + 1100 + 600 + 600 + 690 + 600 = 4190 mm.
- The 3590 mm total in the presentation is retained only as a historical source-document error and is not production truth.

## 2.6.1 hardening applied
- GTV soft-close runners and hinges stay as GTV BOM selections.
- No Blum drilling is substituted for GTV.
- Oven and hob are now separate appliance records sharing the same 600 mm zone.
- Appliance W×H×D must be confirmed before production.
- Hob and sink require their own real worktop cutout geometry.
- Narrow wall-side worktop plinth/upstand is now explicit ProjectModel/BOM data.
- Wall cabinet grooved-back and hanger support exists in the engine, ready for upper-unit promotion after dimensions are confirmed.

## Engineering result
- Panel parts: **46**
- Machining operations: **0**
- Production READY: **NO — expected HOLD**
- Blocking checks: **10**

### Blocking facts
- `KITCHEN_WALL_TRIM_DIMENSIONS_REQUIRED` × 1
- `DRAWER_RUNNER_PROFILE_UNVERIFIED` × 2
- `KITCHEN_WORKTOP_CUTOUT_REQUIRED` × 1
- `HINGE_PROFILE_UNVERIFIED` × 3
- `KITCHEN_APPLIANCE_ENVELOPE_REQUIRED` × 2
- `KITCHEN_HOB_CUTOUT_REQUIRED` × 1

## Why blocker count increased
Revision 4 models unknown real-world facts explicitly. Earlier revisions collapsed some unknowns into notes; 2.6.1 turns them into production gates. This is intentional fail-closed behavior, not a regression.

## Next factual inputs needed
1. Exact GTV runner model/SKU or measured technical profile.
2. Exact GTV hinge model/SKU or measured cup/plate profile.
3. Sink cutout W×D and position.
4. Oven installation envelope W×H×D.
5. Hob installation envelope W×H×D and cutout W×D.
6. Wall-side plinth/upstand height and depth/thickness.
7. Upper cabinet exact depth/placement and back-groove dimensions before promoting upper units to production objects.
