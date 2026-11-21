# Makster AI 2.8.6 — Wall Elevation & Vertical Measurements

## Purpose

2.8.6 adds a true wall-elevation measurement layer on top of the 2D Visual Room Setup Editor.

PLAN and ELEVATION use the same room objects. There is no duplicate drawing model.

## Wall Elevation Editor

Walls:
- SOUTH
- NORTH
- WEST
- EAST

The selected wall is displayed frontally with a vertical grid.

Wall-bound objects shown in elevation:
- door
- window
- radiator
- water
- drain
- power
- hood vent
- gas

PLAN owns horizontal position.
ELEVATION owns vertical measurements.

## Vertical measurements

New scene facts:
- room.heightMm
- object.zMm
- object.heightMm
- object.verticalState

No typical/default vertical dimensions are promoted as facts.
Until both Z and height are entered, the object remains `verticalState=unknown`.

## Single-model behavior

Wall-mounted doors/windows/radiators snap to the nearest wall while dragged in PLAN.
Their wall side and horizontal offset are used directly in ELEVATION.
Changing wall side or horizontal position therefore changes the same object, not a copied drawing.

## ProjectModel persistence

When a Kitchen Studio variant is applied:
- room height is written to Room.dimensions.height when confirmed;
- every wall receives the confirmed room height or UNKNOWN;
- door/window receives hostWallId, Z and confirmed/unknown height;
- radiator receives hostWallId, Z and confirmed/unknown height;
- utility points receive hostWallId and vertical values;
- unmeasured vertical values remain `state=unknown`;
- full MAKSTER_ROOM_SCENE_V1 remains preserved for lossless editor recovery.

## Important boundary

2.8.6 records and visualizes vertical measurements.
Automatic vertical collision checking is intentionally the next engineering layer; this release does not pretend that a measured elevation alone proves installation compatibility.
