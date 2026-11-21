# Makster AI 2.5 — Pro Engineering Merge Architecture

## Merge principle
Makster Pro is not copied as a second application inside Makster AI. Its useful furniture-domain concepts are normalized into the current ProjectModel and deterministic Engineering pipeline.

Old pattern to avoid:

`Visualizer data → Pro local model → separate calculator → separate estimate`

2.5 pattern:

`one ProjectModel Revision → Visual projection → Engineering → Production / Commercial / Contract`

## What was adopted from the Pro lineage
- kitchen-specific section types and dimensions;
- configurable construction flags;
- Gola / push-to-open / profile intent;
- worktop / plinth / legs;
- appliance-aware modules;
- drawer-system choice;
- front material and split concepts;
- side-specific edge and manufacturing-output mindset;
- neutral manufacturing export philosophy.

## What was deliberately not copied as authoritative truth
- old local price calculations;
- demo drilling coordinates;
- generic unverified hardware templates;
- machine-executable claims without a verified postprocessor.

Commercial 1.6 remains the one pricing owner. Engineering 0.7 remains the one production-geometry owner. Manufacturing Data Trust remains the one authority for machining provenance.

## New ProjectModel kitchen surface
Each furniture module may carry a `kitchen` specification with:
- type;
- function;
- construction flags;
- handle/opening intent;
- worktop;
- plinth;
- appliance.

Drawer stacks stay canonical interior elements and therefore reuse the existing Blum engineering code rather than a duplicate Kitchen-only drawer calculator.

## Revision behavior
Every Kitchen Builder action compiles to a typed server-side Visual command. The browser preview is disposable; the committed ProjectModel Revision is canonical.
