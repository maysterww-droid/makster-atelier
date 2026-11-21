# Makster AI 2.6.7 — Mixed Height & Appliance Layout Engine

## Purpose
2.6.7 extends the kitchen layout stack from base-run-only geometry to a single spatial model containing floor-level base/tall modules plus elevated wall modules.

## Implemented
- Mixed floor layer: base cabinets and tall housings share one exact run width.
- Tall placement at the start or end of a wall run without silently stretching carcasses.
- Elevated wall layer with real Z transform, independent width/depth/height and the same Engineering Engine authority.
- Automatic wall projection from the base layer; a `base.oven_hob` slot produces a `wall.hood` slot at the same X position.
- Appliance bindings for oven, hob, dishwasher, refrigerator and hood; exact envelopes may be supplied, while `site_fit` remains explicit where dimensions are intentionally unresolved.
- Real work triangle calculated from actual mixed-height placements: sink, cooking position and tall refrigerator.
- Optional manufacturer/project-specific hood clearance gate. No universal clearance is fabricated when none is supplied.
- Materialization bridge to ProjectModel that emits floor and wall furniture layers and preserves Engineering width invariants.

## Manufacturing architecture
The Mixed Height Engine does not calculate panels, drilling or BOM independently. It only creates normalized ProjectModel geometry. Existing Kitchen Engineering remains the sole manufacturing compiler.
