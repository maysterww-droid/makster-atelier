# Makster AI 2.7.6 — Auto Assignment & Approval Engine

## Purpose

2.7.6 turns catalog recommendations into controlled project changes.

Flow:
Project-aware recommendation → explicit user approval → server re-validates recommendation against current Revision → candidate assignment → new Project Revision → Visual/Engineering recalculation.

## Safety rules

- Browser recommendation payload is never trusted as final truth.
- Server recomputes recommendations from the current project Revision before assignment.
- Candidate must still exist in the current recommendation set.
- INCOMPATIBLE and UNKNOWN candidates cannot be applied.
- Assignment requires approved=true.
- Existing Revision is not mutated; a new Revision is created.

## Hardware assignment

### Hinges
FrontSpec now supports:
- hingeHardwareSelectionId

Engineering resolves hinge hardware per front first, then falls back to old global hinge selection behavior for backward compatibility.

### Runners
Selected runner is written to:
- drawer_stack.runnerHardwareSelectionId

Exact technical profile is added to ProjectModel hardware selections when supported by the catalog record.

## Appliances

The approved manufacturer/model is written into the existing kitchen appliance target while preserving requiredSpace and project geometry.

## UI

Project-Aware Auto Selection results now show:
- “Применить → новая Revision”

After approval:
- project revision advances;
- Visual Scene is refreshed;
- Engineering is recompiled;
- project-aware recommendations are recalculated for the new Revision.

## API

POST /api/v1/projects/:projectId/catalog-assignment/apply

Required:
- approved: true
- furnitureId
- moduleId
- target
- candidateId
- targetRefId/applianceIndex when applicable
