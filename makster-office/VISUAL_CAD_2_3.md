# Visual CAD Architecture — 2.3

`buildVisualScene(ProjectModel)` now derives `cadPanels`, `moduleDimensionChainMm`, `clearancesMm` and collision warnings. None of these become a second persistent geometry model.

Panel edits compile back to domain truth:
- side edge drag → `resize_furniture_edge`
- divider drag → `move_module_divider`
- carcass thickness → `set_carcass_thickness`
- plan placement → `set_furniture_position` / exact clearance / alignment commands
- L-layout → `create_l_corner_layout` creates one shared CAD group over two real furniture objects (`main` + 90° `return`)

This keeps Front, Plan, 3D and Engineering on the same revision.
