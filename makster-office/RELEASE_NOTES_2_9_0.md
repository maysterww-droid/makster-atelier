# Makster AI 2.9.0 — Installation Decision Workflow & Site Tasks

## Purpose

2.9.0 closes the gap between conflict detection and real installation execution.

Makster now distinguishes three things:

1. Physical geometry fixes
   - must change the actual project geometry;
   - cannot be waived by writing a note.

2. Design decisions
   - can be formally recorded in the Project Revision;
   - remain visible in the Installation Decision Ledger.

3. Site tasks
   - can be approved as explicit installation work;
   - become part of the Production Pack;
   - can later be marked completed in another Revision.

## ProjectModel

New optional structured field:
- installationDecisions[]

Each decision stores:
- conflictId
- resolutionSuggestionId
- kind: design_decision / site_task
- status: approved / completed / cancelled
- title/detail
- approvedBy / approvedAt
- completedAt
- sourceRevision
- furniture/module target where available
- addressesWarning flag only for eligible warning-level site tasks

## Non-waivable physical conflicts

Makster refuses to record a “decision” as a substitute for fixing:
- door/opening collision
- radiator/column/duct collision
- worktop above confirmed window/sill
- furniture above confirmed ceiling
- any other BLOCKING collision

These still require actual geometry/measurement changes.

## Warning/site-task workflow

Eligible WARNING example:
“Socket behind furniture.”

Resolution can be:
- service cutout
- accessible service zone
- relocate socket

When approved:
- new Project Revision is created;
- structured site task is stored;
- the matching warning becomes INFO (“covered by approved site task”);
- task is carried into Production Pack.

## Completion

Site tasks can be marked completed.
Completion creates another Project Revision and stores completedAt.

## Production Pack

New files when decisions exist:
- installation-decisions.csv
- site-installation-checklist.txt

Manifest summary adds:
- installationDecisionRows
- openSiteTaskRows

The checklist includes:
- task status
- title/detail
- decision ID
- approver
- approval time
- completion time when completed

## Server gates

POST /api/v1/projects/:projectId/installation-decisions

Requires:
- approved=true
- expectedRevision
- current resolution suggestion
- non-blocking / recordable decision policy

POST /api/v1/projects/:projectId/installation-decisions/:decisionId/complete

Requires:
- current expectedRevision
- valid active decision

No browser-provided conflict text is trusted as authority.
The server reconstructs the current resolution suggestion from the current Revision.
