# Makster AI 3.5.0 — Golden Project End-to-End + Lifecycle Release Gate

## Why 3.5 exists

Makster now contains many individually useful subsystems:
- measurement / room model
- furniture engineering
- hardware/appliance catalogs
- Production Readiness
- Client Approval
- Job Control
- Purchasing
- Costing
- Installer Mode
- Site Change / As-Built
- Closeout / Handover
- secure Client Portal

3.5 adds the layer that verifies these systems agree with one another.

## Lifecycle Release Gate

New report:
`ProjectLifecycleReleaseGateReport`

Overall states:
- GREEN
- AMBER
- RED

Release states:
- DRAFT
- DESIGN_APPROVED
- PRODUCTION_READY
- INSTALLATION_READY
- HANDOVER_READY
- CLOSED

The report contains 10 cross-system gates:

1. MEASUREMENT
2. DESIGN_APPROVAL
3. COMMERCIAL
4. ENGINEERING
5. PURCHASING
6. COSTING
7. INSTALLATION
8. HANDOVER
9. FINANCIAL_CLOSE
10. JOB_LIFECYCLE

The Release Gate does not override the underlying subsystem.
It reads evidence from the authoritative engine for each domain.

## Critical behavior

A project cannot remain green simply because it was green in an older Revision.

Examples:
- geometry changed after client approval -> DESIGN_APPROVAL becomes FAIL
- blocking site issue reported -> ENGINEERING and INSTALLATION become FAIL
- unpaid balance -> FINANCIAL_CLOSE remains WARNING
- unsigned handover -> HANDOVER is not PASS
- supplier orders not fully received -> PURCHASING is WARNING

## New UI

New tab:
`Release Gate`

It shows:
- overall GREEN / AMBER / RED
- lifecycle release state
- PASS / WARN / FAIL counts
- next critical action
- all 10 gates with evidence-derived detail

## API

GET:
`/api/v1/projects/:projectId/lifecycle-release-gate`

## Production Pack

Every Production Pack now includes:
`lifecycle-release-gate.json`

Therefore a production/archive package records the whole lifecycle gate for the exact Project Revision.

## Golden Project #1

3.5 adds a permanent executable regression:
`tests/golden-project-3.5.0.test.mjs`

Run:
`npm run test:golden-project`

Golden Project #1 executes the complete lifecycle:
measurement -> technical design -> client approval -> contract/deposit -> purchasing -> receiving -> costing -> Production Readiness -> handover -> full payment -> CLOSED.

Expected:
- Revision 17
- Production Readiness READY
- Closeout READY_TO_SIGN before handover
- final Lifecycle Release Gate CLOSED / GREEN
- 10 PASS
- 0 WARNING
- 0 FAIL

Negative regressions are also required:
- technical change after approval -> RED
- blocking site issue after closeout -> RED
