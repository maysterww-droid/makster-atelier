# Makster AI 3.3.0 — Client Portal & Approval Center

## Purpose

3.3 creates a public-safe client layer around the same Project Revision.

The client portal is intentionally NOT a reduced copy of the internal Makster workspace.

It exposes:
- project title
- current project stage
- project progress
- client / object summary
- contract value (optional)
- received / outstanding amount (optional)
- target dates (optional)
- milestones (optional)
- approval requests
- public project counts/status

It does NOT expose:
- supplier names
- supplier order prices
- purchase orders
- actual cost
- committed purchase cost
- margin
- internal Engineering blockers
- internal notes
- cost entries

## Client Approval Requests

Kinds:
- design
- materials
- commercial
- change
- handover_precheck

Statuses:
- pending
- approved
- changes_requested
- cancelled

Every approval request stores:
- source Revision
- request title/description
- requested by / requested at
- optional public client amount
- optional target IDs

Client response stores:
- approved / changes requested
- responded by / time
- comment
- approvedRevision for approvals

Client response creates a new Project Revision with source='client'.

## Job Control gate

For contract and later stages:
- Client design approval must exist.

Pending approvals are surfaced as Job Control warnings.

This turns “client approved in WhatsApp” into a structured project event.

## Portal configuration

Owner can configure:
- enabled / disabled
- public title
- welcome text
- show contract value
- show payments
- show target dates
- show milestones

Each configuration change creates a new Revision.

## API

GET  /api/v1/projects/:projectId/client-portal
POST /api/v1/projects/:projectId/client-portal
POST /api/v1/projects/:projectId/client-approvals
POST /api/v1/projects/:projectId/client-approvals/:approvalId/respond
POST /api/v1/projects/:projectId/client-approvals/:approvalId/cancel

All writes require expectedRevision.

## Production Pack / audit

New files:
- client-approvals.csv
- client-portal-snapshot.json

The public snapshot is intentionally filtered and does not contain internal purchasing/costing data.

## Current limitation

3.3 provides the portal data model, internal preview and approval flow.
A hardened externally shareable URL/token/authentication layer is NOT yet implemented.
That should be added before exposing the portal on the public internet.
