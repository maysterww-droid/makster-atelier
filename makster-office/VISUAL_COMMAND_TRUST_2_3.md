# Visual Command Trust Policy — 2.3

2.3 keeps the typed-command boundary. The browser never sends arbitrary ProjectModel patch paths.

New trusted intents:
- `set_carcass_thickness` validates 8–60 mm and rejects thickness incompatible with module geometry.
- `set_furniture_wall_clearance` computes the exact transform from room dimensions and the rotated furniture footprint.
- `align_furniture_to_furniture` computes a deterministic placement relative to another real furniture object with an explicit gap.
- `create_l_corner_layout` validates room fit, return width and module minimums, creates fresh nested IDs, an exact 90° return and a shared CAD-group identity in one atomic Revision. It does not create arbitrary browser-authored geometry.

`cadPanels`, dimension chains, wall clearances and collision warnings are projections returned by `buildVisualScene`. They are not independently persisted.

All accepted commands pass the normal ProjectModel patch/semantic validation and create one immutable Revision.
