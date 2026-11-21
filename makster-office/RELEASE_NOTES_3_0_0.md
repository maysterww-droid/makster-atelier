# Makster AI 3.0.0 — Project Lifecycle / Job Control

## Purpose
Makster now links the technical Project Revision to the real furniture job lifecycle.

Stages:
lead → measurement → design → client_approval → contract → deposit → purchasing → production → delivery → installation → handover → final_payment → warranty → closed

## Separation of authority
Engineering remains authoritative for technical production readiness.
Job Control does not override Production Lock, CNC readiness, Measurement Completeness, Install Check, or Closeout.

## Job Control
ProjectModel now supports:
- client / company / phone / email / object address
- job stage
- contract value
- received payments
- committed supplier purchases
- actual cost
- target delivery / installation dates
- custom milestones
- updatedAt

## Commercial snapshot
The dashboard shows:
- contract value
- received
- outstanding balance
- committed purchasing
- actual cost
- estimated margin
- received percentage

## Lifecycle gates
Examples:
- later stages require client identification
- contract/deposit/purchasing/production require commercial data
- production and later stages expose Technical Production Readiness blockers
- handover/final-payment/warranty/closed require signed Installation Handover
- warranty/closed expose outstanding client balance as a blocker

## UI
New Job Control tab:
- 14-stage lifecycle strip
- client/object card
- money card
- next required action
- technical/business blockers
- warnings
- custom milestones

## API
GET  /api/v1/projects/:projectId/job-control
POST /api/v1/projects/:projectId/job-control
POST /api/v1/projects/:projectId/job-control/milestones

All writes require expectedRevision and create a new immutable Project Revision.

## Production Pack
New file:
- job-control.json

It contains the business lifecycle snapshot for the exact Production Pack Revision.
