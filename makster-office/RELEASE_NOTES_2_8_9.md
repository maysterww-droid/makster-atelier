# Makster AI 2.8.9 — Installation Conflict Resolution Assistant

## Purpose

2.8.9 adds the next layer after collision detection:
Makster proposes concrete resolution paths instead of only reporting conflicts.

## Resolution modes

### AUTO PREVIEW
Used only for simple whole-furniture translation where Makster can prove that:
- the moved furniture remains inside the confirmed room;
- the current blocking count decreases;
- no silent geometry guess is required.

Makster searches X/Y shifts in 50 mm increments up to 1000 mm and ranks candidates by:
1. largest blocking reduction;
2. fewer warnings;
3. shortest move.

Auto-preview never mutates the current Revision.

### MANUAL DECISION
Used for structural/technological decisions such as:
- worktop vs sill;
- furniture height vs ceiling;
- hood duct routing;
- complex layout conflicts.

### SITE WORK
Used for cases such as:
- socket/service access;
- water/drain/gas access;
- technological cutouts or relocation of building services.

## Server-side apply gate

POST /api/v1/projects/:projectId/conflict-resolution/apply

Required:
- approved=true
- expectedRevision
- suggestionId

Before saving:
- server rebuilds the current resolution report;
- suggestion must still be auto-applicable;
- Visual Command is compiled server-side;
- collision result is recomputed;
- if blocking count does not decrease, application is rejected;
- accepted change creates a NEW Project Revision.

## UI

New Resolve tab:
- Auto vs Manual resolution counts
- proposed repair path per conflict
- expected blocker reduction
- “Применить → новая Revision” only for proven auto-applicable moves
- link back to Install Check

## Safety

Makster does NOT automatically:
- move windows/doors/building services;
- change sill height;
- change furniture height;
- cut service holes;
- reroute hood ducts.

Those remain explicit designer/site decisions.
