# Makster AI 2.6.4 — Kitchen Layout Planner

## Scope
Kitchen Layout Planner converts room geometry and kitchen requirements into multiple production runs while keeping Kitchen Run Composer and the existing Engineering Engine as the manufacturing authority.

Supported layouts:
- straight
- L-shape
- U-shape
- parallel / galley
- island

## Safety / engineering behaviour
- validates room geometry;
- validates minimum aisle for parallel/U layouts;
- blocks islands that do not fit the requested clearance;
- keeps standard cabinet widths and technical fillers through Kitchen Run Composer;
- supports declared water, drain, power, hood vent and gas points;
- warns when a service-dependent module is not near a declared utility point;
- never invents missing utility coordinates;
- creates real Transform3D positions/rotations for each run;
- remaps front -> module references when one template kitchen becomes multiple runs;
- feeds generated furniture into the existing Engineering Engine.

## Important limitation
This version plans orthogonal rectangular-room layouts. Obstacle/opening avoidance, true corner-cabinet families, automatic work-triangle scoring, wall-cabinet synchronization and interactive drag UI remain next-stage work.
