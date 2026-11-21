# Makster 2.1 — Known Limits

2.1 strengthens interactive editing and revision trust; it is not yet full general-purpose furniture CAD parity.

## Visual
- 3D remains lightweight axonometric geometry, not photoreal PBR.
- Room editing is rectangular-first. Free-form wall polygons are not yet editable in the UI.
- Doors/windows/obstacles are preserved and protected during room resize, but do not yet have complete drag handles.
- No photo/sketch underlay tracing UI yet.
- Cabinet resize currently exposes the right-edge handle; top/left/depth handles are next.

## Furniture coverage
- Deterministic Engineering is strongest for modular wardrobes/carcasses.
- Kitchens, corner units, worktops, sinks/appliances, sliding-door systems, advanced fillers/scribes, wall panels and free-form custom geometry need deeper rule packs.
- Shelf drag records adjustable shelf elevations, but production drilling still follows the existing System 32 rule set; fixed-shelf construction logic is a separate future command/rule.

## Catalog / production
- Full material/hardware catalog assignment is not yet exposed in the visual shell.
- Production/Commercial correctly remain HOLD when required selections or trusted manufacturer data are unresolved.
- Broad beta still requires 20–30 anonymized real Makster Atelier jobs through visual → engineering → production with a target of zero critical dimension errors.
