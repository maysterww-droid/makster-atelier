# Makster 2.0 — Known Limits

2.0 is the first complete Visual Product loop, not a declaration of full market parity.

## Visual
- 3D is lightweight axonometric geometry, not photoreal PBR rendering.
- Room editor currently focuses on rectangular room dimensions; wall-by-wall/free-form polygon editing is next.
- Doors/windows/obstacles are preserved by room resizing but do not yet have full drag handles in the UI.
- No photo/sketch-underlay tracing UI yet.

## Furniture coverage
- Current deterministic Engineering remains strongest for modular wardrobes/carcasses.
- Kitchen corner units, worktops, sinks/appliances, sliding-door systems, advanced fillers/scribes, complex wall panels and free-form custom geometry need deeper rule packs.
- Visual section content editing intentionally removes no hidden uncertainty: changing a section to drawers without selecting a runner may make Production/Commercial HOLD.

## Materials/hardware
- 2.0 Inspector edits geometry/content/style notes; full catalog browsing and material/hardware assignment UI is not yet complete.
- The backend already supports selections and Blum technical profiles, but the new visual shell does not expose the entire catalog workflow yet.

## Commercial/production
- Quote and Production tabs are connected to the same revision.
- If a visually created AI project lacks production-critical selections, downstream modules correctly return HOLD instead of guessing.

## Proof requirement
Before broad beta, run 20–30 anonymized real Makster Atelier jobs through the full visual → engineering → production loop and target zero critical dimension errors.
