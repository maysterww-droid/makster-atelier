# Makster AI 2.8.1 — Hardware Studio

## New workspace

Hardware Studio is now a separate designer/technologist workspace.

Catalog Admin remains responsible for:
- import pipeline
- review queue
- promotion/rejection
- persistent catalog administration

Hardware Studio is responsible for:
- hardware search
- brand filtering
- role filtering
- article/family inspection
- catalog trust/source
- drilling-profile status
- compatibility facts
- Top 3 auto-selection
- project-aware hinge/runner recommendations
- explicit application through a new Project Revision

## Hardware Studio UI

Shows:
- manufacturer
- series/family
- article/code
- role
- trust level
- source
- verified drilling profile / not imported status
- max front thickness where normalized
- nominal runner length where normalized
- verified load where normalized
- Top 3 selection score and compatibility
- production drilling trust

Brand coverage is explicit.
Registry-only manufacturers are shown as such rather than pretending their full catalogs are already loaded.

Current registry:
Blum, Hettich, Häfele, GTV, GRASS, Salice.

Current runtime master records in the bundled base remain intentionally limited to the records already normalized before 2.8.1.

## Project integration

“Подобрать по проекту” reads the current immutable ProjectModel revision.

Hardware recommendations are limited to:
- hinge
- runner

Compatible recommendations can be applied via:
“Применить → новая Revision”

The existing 2.7.6 server approval/revalidation path remains authoritative.

## Fixed legacy UI defect

Previous builds contained Catalog functions but did not initialize `state.catalog`, and Catalog was absent from renderTab routing.
2.8.1 fixes both defects.

Catalog Admin and Hardware Studio can now be opened without that state/routing failure.
