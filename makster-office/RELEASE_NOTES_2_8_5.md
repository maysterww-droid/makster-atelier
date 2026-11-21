# Makster AI 2.8.5 — Visual Room Setup Editor

## Purpose

2.8.5 removes the advanced JSON setup fields from Kitchen Design Studio.

Room conditions are now edited visually on plan.

## Visual Room Setup

Users can add and position:
- doors
- windows
- radiators
- columns
- shafts/duct boxes

Utilities:
- water
- drain
- power
- hood vent
- gas

Objects can be selected and moved on the plan.
Exact X/Y/width/depth/clearance values remain editable numerically in the inspector.

Door opening zones are visualized separately and are sent to the existing Constraint Engine.

Utilities are sent to the existing Kitchen Utility engine using exact accepted kinds:
- water
- drain
- power
- hood_vent
- gas

## Generator integration

Kitchen Studio generation now derives:
- obstacles
- openingZones
- utilities

directly from the visual Room Scene.

No duplicate room calculator was introduced.

## Persistence

When a Top 3 variant is applied:
- Room Scene is materialized into ProjectModel.site.rooms
- door/window entries become Room.openings
- radiator/column/shaft entries become Room.obstacles
- utilities are preserved as typed room obstacles/notes
- generated furniture is linked to the room via roomId
- the complete editor scene is retained in a MAKSTER_ROOM_SCENE_V1 system note for lossless round-trip/recovery

Vertical dimensions are NOT invented.
Where the visual editor has only 2D information, ProjectModel height remains state='unknown'.

## Future extension

2.8.5 is the 2D measured-plan layer.
Wall elevation editing, sill heights, ceiling levels and vertical utility coordinates remain a later room-elevation layer.
