# Makster AI 2.3 — Release Notes

## Furniture CAD Geometry

2.3 adds the first CAD geometry projection over the canonical ProjectModel. Structural panels are derived, not independently persisted.

### Added
- CAD panel projection for sides/top/bottom/dividers.
- Exact carcass thickness editor tied to Engineering.
- Four wall clearances.
- Exact wall-clearance placement command.
- Furniture-to-furniture alignment with gap.
- Plan grid + magnetic snapping and snap guides.
- Module dimension chain.
- Collision warnings for furniture vs obstacles and furniture vs furniture.
- First-class L-corner layout command with shared CAD group, `main`/`return` roles, left/right hand, exact 90° return and explicit return width.

### Trust
Every committed edit still creates one immutable Revision. Preview geometry is disposable. Engineering remains the production truth compiler.

### Corner boundary
The L-corner feature intentionally composes two normal Engineering-backed rectangular furniture objects. A true one-piece special corner carcass remains outside 2.3 until a dedicated Engineering rule pack exists.
