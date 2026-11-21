# Makster AI 2.8.7 — Room Measurement Completeness

## Purpose

2.8.7 turns the visual room/elevation data into a formal measurement checklist.

Makster now distinguishes:
- COMPLETE
- MISSING
- REVIEW

No unknown measurement is converted into a default production fact.

## What is checked

Room:
- width
- depth
- height
- wall heights

Openings:
- door wall binding
- door Z / height
- window wall binding
- sill / lower-window Z
- window height

Obstacles:
- radiator wall binding
- radiator Z / height
- column/shaft vertical data → REVIEW when only 2D is known

Utilities:
- wall binding
- vertical Z for power, water, drain, hood vent, gas

The lossless `MAKSTER_ROOM_SCENE_V1` note is used to preserve exact editor measurement state.
This allows Makster to distinguish a real Z=0 from an UNKNOWN Z that was temporarily materialized at floor level in ProjectModel geometry.

## API

GET /api/v1/projects/:projectId/room-measurement-completeness

## UI

New Measurements tab:
- completeness percentage
- Complete / Missing / Review counters
- grouped checklist for ROOM / OPENING / OBSTACLE / UTILITY
- direct return to Kitchen Studio / Wall Elevation for corrections

## Production integration

MISSING measurement items are now hard Production Readiness blockers.

REVIEW items become warnings.

This means a project cannot become production READY while a critical room measurement such as:
- room height
- sill height
- door height
- radiator vertical position
- utility Z

is still unknown.

## Safety rule

UNKNOWN stays UNKNOWN.

No common/typical height for sockets, water, drains, windows or radiators is inserted automatically.
