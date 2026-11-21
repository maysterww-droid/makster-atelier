# Makster AI 2.7.4 — Catalog Auto-Selection Engine

## What changed

Makster can now automatically rank hardware and appliances from the verified master catalog.

### Hardware auto-selection
Inputs:
- role: hinge / runner / lift / connector / other
- front thickness
- desired nominal runner length
- expected dynamic load
- preferred/excluded manufacturers
- production drilling requirement

Ranking considers:
- compatibility result
- trusted manufacturer/project drilling availability
- preferred manufacturer order
- verified dimensions and load data
- UNKNOWN is penalized and never treated as confirmed fit

Safety:
If production-ready drilling is required, UNKNOWN candidates are rejected even when a drilling profile exists. Dimensional compatibility and drilling trust are separate gates.

### Appliance auto-selection
Inputs:
- kind
- niche width / height / depth
- ventilation
- preferred/excluded manufacturers

Results:
- Top N (default 3)
- recommended candidate
- compatibility and selection scores
- reasons
- confirmed/UNKNOWN distinction

### API
POST /api/v1/catalogs/hardware/auto-select
POST /api/v1/catalogs/appliances/auto-select

### UI
Catalog tab now has “Подобрать Top 3”.
It uses the same dimensional fields as Compatibility check and displays ranked candidates, compatibility status, production readiness and reasons.
