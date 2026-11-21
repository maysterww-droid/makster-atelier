# Makster 2.0 — Visual Product Architecture

## Goal

A furniture maker must be able to open Makster and complete a visible loop without touching JSON:

1. Create/open a project.
2. Define room dimensions.
3. Describe furniture to Makster AI.
4. See the generated furniture immediately.
5. Edit dimensions and section layout visually.
6. Recalculate Engineering from the same Revision.
7. Price the same Revision.
8. Generate a manual/outsource Production Pack.

## Projection model

`buildVisualScene(ProjectModel)` is a derived projection only. It resolves editor-friendly values such as module X positions and widths, but it is never persisted as an independent source of truth.

## Views

### PLAN

- rectangular room outline;
- furniture footprint from `transform.position`, rotation and dimensions;
- drag furniture to update X/Y through a typed command.

### FRONT

- overall width/height;
- resolved module widths;
- interior symbols for shelves, drawers and rails;
- selected section state;
- divider hit areas for atomic adjacent-width edits.

### 3D

- lightweight axonometric view built from the same width/height/depth values;
- no duplicate 3D database;
- intended as the first product visualization layer, not photoreal rendering.

## Revision semantics

Every accepted visual command:

1. reads the current Project Revision;
2. verifies optimistic concurrency (`expectedRevision`);
3. compiles a typed command to a `ProjectChangeSet`;
4. runs normal ProjectModel semantic validation;
5. creates a new immutable revision;
6. recalculates Engineering;
7. returns the new visual projection.

This means dragging one divider is a real project change, not a browser-only decoration.

## Market-facing priority

2.0 intentionally stops adding unrelated backend departments and concentrates on the user-facing design loop. Future 2.x work should first deepen visual/design coverage and production-proven furniture rules before adding new peripheral modules.
