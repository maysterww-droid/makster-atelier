# Makster 2.2 — Known Limits

2.2 is a stronger room-level Visual Editing loop, not full market parity with mature CAD suites.

## Visual / room
- Room remains rectangular-first; no free-form polygon/wall-node editor yet.
- Door/window/obstacle bounding boxes can be placed and dragged in Plan, but hosted opening offsets are not yet wall-parametric constraints.
- 3D remains lightweight axonometric geometry, not photoreal PBR.
- No photo/sketch underlay tracing yet.

## Corner work
- 2.2 supports an engineering-backed L-layout made from two rectangular furniture objects.
- A true one-piece corner cabinet, corner worktop, diagonal front, blind-corner hardware and corner-specific joinery are not implemented yet.

## Furniture engineering
- Deterministic Engineering remains strongest for wardrobes/carcasses.
- Kitchen worktops, sinks/appliances, sliding systems, advanced fillers/scribes and free-form custom geometry need deeper rule packs.

## Materials / hardware
- Full catalog browsing and assignment is not yet exposed across the new visual shell.
- Missing production-critical selections correctly keep Engineering / Commercial / Production on HOLD instead of guessing.

## Validation requirement
Before broad beta, run 20–30 anonymized real Makster Atelier jobs through room → multi-object visual edit → Engineering → Production and target zero critical dimension errors.
