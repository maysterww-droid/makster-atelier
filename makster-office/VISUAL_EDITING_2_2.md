# Makster Visual Editing 2.2

## Objective

Move Makster from a single-furniture interactive editor toward a room-level furniture CAD loop without splitting geometry truth across views.

## Multi-object room model

`ProjectModel.furniture[]` is the only furniture collection. Plan renders every item. Inspector selects one item. Front and 3D render the selected item. Engineering compiles every item in the same revision.

`duplicate_furniture` performs a structural clone with fresh IDs for:
- furniture;
- modules;
- interior elements;
- fronts.

Material/hardware selection references remain references to the same catalog selections. Front `moduleIds` are remapped to the duplicated module IDs.

## L-layout

The UI can create a 90° return by duplicating the selected furniture in one typed command with an offset and `rotationZDeg=90`.

This is intentionally **not** labelled a true corner cabinet. It is a two-object L composition until dedicated corner engineering rules exist.

## Four-edge resize

`resize_furniture_edge` accepts `left | right | top | bottom` plus a delta.

- right: changes width, left edge anchored;
- left: changes width and shifts footprint origin, right edge anchored;
- top: changes height, bottom anchored;
- bottom: changes height and Z origin, top anchored.

Width changes redistribute fixed module widths proportionally in integer 0.1 mm units. Server-side room bounds and module min/max rules run before commit.

## Room features

Openings and obstacles use the existing ProjectModel `Room.openings[]` and `Room.obstacles[]` fields.

2.2 adds typed add/move/remove commands. Visual Scene projects their bounding boxes into Plan. UI drag is preview-only until pointer-up.

## Dimension layer

Plan shows:
- room width/depth;
- selected furniture footprint width/depth;
- selected furniture X/Y offsets from the room origin.

Front keeps overall width/height and per-module widths.

## Revision semantics

Every committed interaction follows:

`pointer preview → typed command → expectedRevision check → trusted ProjectChangeSet → semantic validation → immutable Revision → Engineering recalc → Visual Scene rebuild`.
