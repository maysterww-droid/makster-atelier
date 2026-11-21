# Visual Command Trust Policy — 2.2

Makster accepts domain commands, not arbitrary client-authored JSON Patch paths.

## New protected intents

- `resize_furniture_edge`
- `duplicate_furniture`
- `remove_furniture`
- `add_room_opening`
- `move_room_opening`
- `remove_room_opening`
- `add_room_obstacle`
- `move_room_obstacle`
- `remove_room_obstacle`

Trusted server code decides exact ProjectModel paths and validates the result before a revision is created.

## Geometry trust

- Furniture must remain inside room width/depth/height.
- Openings and obstacles must remain inside room bounds.
- Width resize cannot drive any proportional fixed module below 100 mm or above 4000 mm.
- Left/bottom edge resize updates dimension + position atomically.
- Room resize cannot silently clip furniture, openings or obstacles.
- Rectangular room resize preserves existing wall IDs when wall topology remains four segments.

## Identity trust

Duplicate furniture gets fresh entity IDs. A duplicated object must never reuse furniture/module/interior/front IDs from the source.

## History trust

Undo/Redo receives only a historical revision number. The server retrieves the historical snapshot itself and writes a new revision. Browser state cannot rewrite an old revision.
