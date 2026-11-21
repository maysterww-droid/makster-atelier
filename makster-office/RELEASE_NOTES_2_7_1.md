# Makster AI 2.7.1 — Room & Appliance Setup Studio

Kitchen Design Studio now accepts measured room constraints before generation:

- obstacles: doors, windows, radiators, columns, boilers, ducts and other measured rectangles;
- opening zones: door/sash/swing clearance rectangles;
- utilities: water, drain, power, hood vent and gas with wall side, offset and optional tolerance;
- appliance bindings: confirmed appliance specifications bound to kitchen library modules;
- all data is passed into the existing Auto Layout Optimizer / Constraint Engine / Mixed Height engine.
- no second engineering calculator is introduced.

The Studio UI exposes these inputs in an expandable setup panel. Advanced fields are JSON in 2.7.1; a graphical room editor remains a later UI layer.
