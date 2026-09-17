# Creative Studio 0.9 — Makster Asset Bridge

Creative Studio can now ingest a validated Makster Module Library package without inventing product geometry. Only modules marked `READY` are accepted. Required creative inputs are preview, GLB, module metadata and validation report; motion metadata is optional but preserved when available.

Registration converts each package into brand-scoped Creative Assets. A Product Truth Snapshot locks module id/version/dimensions/materials/hardware. A Creative Reference Pack binds the real module references and truth snapshots to a creative project so downstream generation and QA can detect product/version/geometry drift.

The included `M_BASE_DOOR_600_V1` file is a zero-network contract fixture, not a claim that the live Module Library has been fetched. Live Supabase/Asset Bridge ingestion remains disconnected until the specific production project and storage paths are explicitly wired.
