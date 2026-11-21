# Makster 1.0 — Machine-Independent Production Pack

Makster 1.0 does not require the workshop to own a CNC machine.

The canonical flow is:

```text
Project Digital Twin
→ Engineering
→ Universal Production Model
→ Manual Workshop Pack | Outsource Supplier Pack | optional CNC extension
```

## Manual Workshop Pack

Designed for workshops that cut, edge and drill mechanically or with standalone machines/jigs.

Generated files:

- `cutlist.csv` — parts and final dimensions;
- `materials.csv` — material summary;
- `edging.csv` — every edged side and edge length;
- `drilling.csv` — coordinates + trust/status per operation;
- `hardware.csv` — hardware requirements;
- `part-labels.csv` — stable part IDs for stickers/marking;
- `assembly-sequence.csv` — module-by-module assembly order;
- `workshop-checklist.txt` — production QA checklist;
- `printable-parts.html` — printable human-readable schedule;
- `production-pack-manifest.json` — version + SHA-256 for every payload file.

`CNC READY` is not required. Operations marked `CHECK/REFERENCE` must be verified using a manufacturer jig/manual or by the technologist before mechanical drilling.

## Outsource Supplier Pack

Three first-class service presets:

1. `cutting_only`
2. `cutting_edging`
3. `cutting_edging_drilling`

The first two can be released when Engineering is Production Ready even if exact CNC drilling data is not available.

The third is blocked until every machining operation being outsourced is exact. Makster must not send estimated/reference-only drilling coordinates to a supplier as production truth.

Generated supplier files include:

- `supplier-order.json` — machine-readable order contract;
- `supplier-readme.txt` — human instructions;
- requested service files only;
- common material, hardware, label and printable schedules.

## Part identity

Every returned panel should preserve Makster `part_id` (label or marker). This allows a future receiving/QA workflow to compare returned parts against the exact Project Revision.

## Future extensions

- supplier templates (different column names / XLSX exports);
- supplier portal and quote requests;
- nesting/cutting optimization;
- QR labels;
- receiving/quality-control scan;
- marketplace offers;
- controller-specific CNC postprocessors as optional adapters.
