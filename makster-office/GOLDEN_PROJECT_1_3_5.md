# Golden Project #1 — Makster AI 3.5.0

## Scenario

A small production-ready kitchen module is used as a deterministic end-to-end regression fixture.

The scenario intentionally crosses subsystem boundaries instead of testing isolated functions.

Flow:

1. Confirmed kitchen room measurement.
2. EGGER carcass + edge material selections.
3. Production-ready kitchen base module.
4. Job Control client + contract + deposit.
5. Client design approval with technical SHA-256 fingerprint.
6. Purchasing requirements generated from actual Engineering BOM.
7. Supplier order created.
8. Supplier order approved.
9. Supplier order ordered.
10. Every supplier line fully received.
11. Labor + installation Estimate entered.
12. Labor + installation Actual entered.
13. Production Readiness checked = READY.
14. Job moved to handover.
15. Installation Closeout checked = READY_TO_SIGN.
16. Client handover signed.
17. Final client balance paid in full.
18. Job Control moved to CLOSED.
19. Lifecycle Release Gate evaluated.
20. Production Pack generated for the same Revision.

## Expected final state

- Project Revision: 17
- Release State: CLOSED
- Overall Status: GREEN
- PASS: 10
- WARNING: 0
- FAIL: 0

Required PASS gates:

- MEASUREMENT
- DESIGN_APPROVAL
- COMMERCIAL
- ENGINEERING
- PURCHASING
- COSTING
- INSTALLATION
- HANDOVER
- FINANCIAL_CLOSE
- JOB_LIFECYCLE

## Negative regression cases

The test suite also proves that a previously green project becomes RED when:

### Technical design changes after client approval

Changing the approved furniture geometry changes the technical approval fingerprint.

Expected:
- Client design approval = stale
- DESIGN_APPROVAL = FAIL
- Overall Release Gate = RED

### A blocking site issue is reported after closeout

Expected:
- ENGINEERING = FAIL
- INSTALLATION = FAIL
- Overall Release Gate = RED

This is intentional. A historical GREEN state is not allowed to hide a new real-world blocker.

## Run

`npm run test:golden-project`

The test runs directly against the bundled Makster runtime.
