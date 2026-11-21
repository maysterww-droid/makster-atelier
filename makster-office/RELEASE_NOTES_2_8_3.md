# Makster AI 2.8.3 — Project Auto-Complete

## Purpose

Project Auto-Complete analyzes the current immutable Project Revision and tells the technologist what remains unresolved before production.

It does not guess missing measurements.

## Status model

- COMPLETE — already assigned/confirmed in the current revision.
- SAFE AUTO — reserved for future no-risk deterministic fixes.
- NEEDS APPROVAL — a confirmed compatible candidate exists and can be applied through explicit approval/new Revision.
- NEEDS MEASUREMENT — required project data is missing; Makster refuses to infer it.
- BLOCKING — no confirmed compatible option or a production blocker remains.

## Current checks

- hinged fronts without assigned hinge hardware;
- drawer stacks without confirmed runner nominal length/assignment;
- appliances without confirmed installation envelope;
- catalog-backed hardware with missing drilling authorization;
- appliance ventilation/installation verification from Production Intelligence.

## UI

New Auto Complete tab:
- readiness percentage;
- Complete / Approval / Measure / Blocking counters;
- actionable checklist;
- “Применить → новая Revision” for confirmed compatible catalog candidates;
- re-check current Revision.

## Safety

Examples:
- 18 mm front + verified compatible hinge -> NEEDS APPROVAL, never silently assigned.
- drawer cabinet depth does NOT become runner nominal length -> NEEDS MEASUREMENT.
- missing appliance niche/ventilation remains unresolved rather than guessed.
