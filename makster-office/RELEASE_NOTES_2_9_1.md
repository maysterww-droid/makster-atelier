# Makster AI 2.9.1 — Installer Mode & Site Execution Pack

## Purpose

2.9.1 gives the installer a dedicated execution layer.

The installer no longer needs to interpret the full engineering/project workspace.
Installer Mode shows only:
- approved site tasks;
- completed site tasks;
- open site issues;
- missing critical measurements;
- blocking installation collisions.

## Installer Mode status

- READY_FOR_INSTALL
- INSTALL_IN_PROGRESS
- BLOCKED

Status is computed from the current Project Revision.

## Site task execution

Approved `site_task` decisions from 2.9.0 appear directly in Installer Mode.

Installer can mark a task completed.
Completion:
- creates a new Project Revision;
- stores completedAt;
- preserves the previous Revision unchanged.

## Site issue reporting

Installer can report a new issue from site:
- info
- warning
- blocking

The issue is stored as structured `installationSiteIssues[]`.

Each issue stores:
- status
- severity
- title/detail
- reporter
- reportedAt
- resolvedAt
- sourceRevision
- optional furniture/module target

Reporting an issue creates a NEW Project Revision.

Resolving an issue also creates a NEW Project Revision.

## Production Readiness integration

Open BLOCKING site issues create:
`INSTALLATION_SITE_ISSUE`

and force Production Readiness to HOLD.

Open WARNING issues appear as Production Readiness warnings.

A resolved site issue no longer blocks the project.

## Production Pack

New site-execution outputs:
- site-issues.csv
- installer-execution.json

Existing:
- installation-decisions.csv
- site-installation-checklist.txt

Manifest summary now also includes:
- openSiteIssueRows

`installer-execution.json` is a machine-readable snapshot of the site-task and site-issue state for the exact Project Revision.

## Safety / revision discipline

Nothing from site overwrites historical project state.

Every:
- task completion
- new site issue
- issue resolution

creates another immutable Project Revision.

Installer Mode never silently changes furniture geometry.
Geometry changes still go through normal Project/Resolution workflows.
