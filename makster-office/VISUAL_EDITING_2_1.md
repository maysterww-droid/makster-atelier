# Makster Visual Editing 2.1

## Interaction transaction

1. `pointerdown` captures the committed scene geometry and scale.
2. `pointermove` edits only a disposable client `previewScene`.
3. Snapping and local constraints are applied for immediate UX feedback.
4. `pointerup` emits exactly one typed VisualEditorCommand.
5. The server recompiles the command to a trusted ProjectChangeSet.
6. ProjectModel semantic/bounds validation runs.
7. One immutable Project Revision is created.
8. Visual Scene and Engineering are rebuilt from that exact revision.

There are no per-pixel revisions.

## Front

- Divider drag: left `+Δ`, right `-Δ`; pair sum unchanged; minimum 100 mm each.
- Right-edge resize: left edge is anchored during preview; overall width and all fixed module widths change in one revision. Proportions are preserved with deterministic remainder distribution in 0.1 mm canonical units.
- Shelf drag: shelf elevation is stored as `elevationsFromBottom` in the ProjectModel shelf stack. Shelves cannot cross and must remain at least 32 mm apart.

## Plan

- Furniture XY drag has 10 mm snapping.
- Rotation-aware footprint is clamped to room width/depth in the UI.
- Server-side bounds validation repeats the check independently.

## Undo / Redo

Undo does not move the database pointer backward and does not mutate an old snapshot. `visual-restore` loads a server-owned historical snapshot and writes it as the next immutable revision, then rebuilds Visual Scene + Engineering. Redo uses the same restore primitive.

## 3D

3D stays a projection of the current `VisualScene`, whose geometry is derived from ProjectModel. There is no detached 3D dimension store or rendered-image truth.
