# Creative Studio 1.2 — Real Generation Adapter Gate

The provider boundary now includes a concrete Runway adapter contract without performing a paid generation. The adapter is transport-injected so provider credentials and API details remain outside Studio core. It supports IMAGE/VIDEO capability, requires at least one reference asset, preserves brand scope, records authorization/reference metadata, estimates cost before generation and refuses execution unless an explicit LIVE human authorization is present.

`providers/execution-gate.ts` is the hard spend switch. DRY_RUN always blocks a real provider call. LIVE still requires a human authorization id and can be capped by maximum authorized cost. This is intentionally separate from the project BudgetGuard: both gates are expected in live orchestration.

`MAK-COMMERCIAL-001.plan.json` prepares the first 15-second Makster Atelier commercial: 9:16 primary, 1:1 and 16:9 variants, premium restrained material-led direction, real Makster Module Library product truth, four shot intents, Czech copy, optional professional Czech voice and restrained sound design. Provider execution remains blocked; no generation credits are spent by this milestone.

Next: bind an authenticated provider transport and media assembler, resolve provider-returned asset ids into the Asset Registry, append CostLedger + ProvenanceLog automatically, run Premium QA on takes, then stop at Human Approval before export/delivery.
