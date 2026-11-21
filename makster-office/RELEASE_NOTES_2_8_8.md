# Makster AI 2.8.8 — Automatic Collision & Installation Check

## Purpose

2.8.8 turns confirmed room/elevation measurements into automatic installation conflict checks.

The engine uses the same ProjectModel coordinates that drive plan/elevation/production.

## Current collision checks

### Openings
- furniture vs door/street opening volume -> BLOCKING
- furniture vs window volume -> BLOCKING

### Obstacles
- radiator -> BLOCKING
- column -> BLOCKING
- duct/shaft -> BLOCKING
- boiler -> BLOCKING

### Utilities
- switch behind furniture -> BLOCKING
- socket behind furniture -> WARNING
- water/drain/gas pipe inside furniture zone -> WARNING
- vent inside furniture zone -> WARNING

### Vertical/installation
- furniture top above confirmed room height -> BLOCKING
- worktop above confirmed window/sill bottom -> BLOCKING
- worktop within 30 mm of sill -> WARNING
- hood module without confirmed vent -> WARNING
- hood vs nearest vent horizontal offset > 450 mm -> WARNING

## Production integration

Blocking installation items now enter Production Readiness as distinct blocker codes, for example:
- INSTALLATION_OPENING_COLLISION
- INSTALLATION_OBSTACLE_COLLISION
- INSTALLATION_WORKTOP_WINDOW
- INSTALLATION_CEILING_COLLISION

Warnings are retained separately and do not masquerade as confirmed-safe geometry.

## UI

New `Install Check` tab:
- PASS / REVIEW / BLOCKED
- blocking/warning counters
- exact conflict list
- distance where relevant
- jump back to Room / Wall Elevation

## Design principle

Confirmed geometry can block production.
Unknown geometry is handled by Measurement Completeness first.

The collision engine does not invent missing Z/H values.
