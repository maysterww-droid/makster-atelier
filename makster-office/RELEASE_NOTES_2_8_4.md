# Makster AI 2.8.4 — Production Lock & Readiness Dashboard

## Purpose

2.8.4 turns Auto-Complete + Engineering into a server-enforced Production Release Gate.

A project cannot enter Production Pack merely because the UI button was clicked.

## Production Readiness

New report:
- READY / HOLD
- productionReady
- cncReady
- readinessPercent
- blocking reasons
- warnings
- Auto-Complete summary
- Engineering check summary

New endpoint:
GET /api/v1/projects/:projectId/production-readiness

## Hard server lock

POST /api/v1/projects/:projectId/production-pack/preview now re-checks the CURRENT saved Revision.

If productionReady=false:
HTTP 409 `production_readiness_hold`

If outsource drilling is requested and cncReady=false:
HTTP 409 `cnc_readiness_hold`

This check is server-side. Disabling/enabling a browser button cannot bypass it.

## What blocks production

- Engineering blocking/error issues
- Auto Complete BLOCKING
- Auto Complete NEEDS_MEASUREMENT
- Auto Complete NEEDS_APPROVAL
- missing hardware drilling verification where required
- unresolved appliance installation/ventilation rules
- empty/no-part Project Revision (`NO_PRODUCTION_CONTENT`)

## Manual vs CNC

Production readiness and CNC readiness are intentionally separate.

A project may eventually be eligible for manual/cutting work while CNC drilling remains HOLD.
Outsource `cutting_edging_drilling` requires both productionReady and cncReady.

## UI

Production tab is now a Readiness Dashboard:
- Production LOCKED / UNLOCKED
- CNC READY / HOLD
- blocking count
- warning count
- Revision
- readiness %
- exact blocking reasons
- disabled production buttons while locked
- link-by-workflow back to Auto Complete items
