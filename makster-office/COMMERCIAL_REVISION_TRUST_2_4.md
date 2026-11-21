# Makster 2.4 — Commercial Revision Trust

## Core invariant

**A new Project/CAD Revision never silently inherits a customer's previous approval.**

If a commercial contract exists for Revision N and the project becomes Revision N+1, Manufacturing Approval is denied with `REVISION_NOT_CURRENTLY_CONTRACTED` until an exact client authorization exists.

## Binding chain

`Project revision + Engineering checksum → Commercial estimate fingerprint → Quote fingerprint → Contract → Change report fingerprint → Change Order binding → Client acceptance fingerprint → ClientRevisionAuthorization`

A mismatch anywhere in this lineage is a blocker, not something AI may infer away.

## Quote lifecycle

Supported states:
`draft → approved → sent → accepted`
with rejection/expiration paths and `accepted → superseded` only when an accepted Change Order replaces the contracted quote.

## Change Order trust

The Change Order binds:
- project ID;
- from/to revisions;
- base/new quote IDs and fingerprints;
- Change Impact Report ID and fingerprint;
- currency;
- previous/new customer totals and delta.

The customer-facing document excludes internal cost basis, markup, margin and profit.

## Payments

Already paid installments are immutable for automatic rebalancing. New agreed total is redistributed only over unpaid installments. Automatic acceptance is blocked if the new total would be below money already paid.

## Client token

The send operation generates a cryptographically random approval token. The raw token is returned once. Internal state stores only its SHA-256 hash. Public endpoints require the raw token and reject invalid/expired tokens with HTTP 403.

## Production gate

No commercial contract: legacy technical production gates still apply.

Commercial contract exists:
- contracted current revision: allowed commercially;
- changed unapproved revision: blocked;
- exact revision with valid immutable ClientRevisionAuthorization: allowed commercially.

Commercial approval never bypasses Engineering, Release Trust, technologist approval, CNC/machine or other technical gates.
