# Makster AI 2.7.5 — Project-Aware Auto Selection

Makster now reads compatibility context directly from the current ProjectModel revision.

## Automatically derived context

### Hinges
- detects hinged fronts attached to each module;
- follows front.materialSelectionId;
- reads the confirmed front material thickness;
- sends that thickness into Catalog Auto-Selection.

### Runners
- detects drawer_stack elements;
- if a runner hardware selection already exists with a technical nominal length, that confirmed nominal length is reused;
- cabinet depth is NOT converted into a runner length automatically.

### Appliances
- reads kitchen appliance/appliances from the module;
- reads requiredSpace W/H/D when confirmed;
- maps it into appliance niche compatibility context;
- missing dimensions remain absent/UNKNOWN.

## Output

GET /api/v1/projects/:projectId/catalog-auto-selection

returns:
- recommendation per furniture/module/target;
- context facts used;
- Top candidates;
- READY / REVIEW totals;
- explanations of missing facts.

## UI

Catalog now includes “Подобрать по текущему проекту”.
The report shows module-by-module recommendations without requiring the user to re-enter dimensions manually.

2.7.5 still does NOT silently write a hardware/appliance selection into ProjectModel. It recommends against an immutable revision first. Assignment/approval is intentionally a separate next step.
