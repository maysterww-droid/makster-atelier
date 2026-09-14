# Makster Quote — Phase 2 Library Completeness Audit 0.2

## Goal
Verify that a new workshop can price three realistic furniture jobs from the module library without inventing missing cabinet types or hiding important hardware cost inside generic hinges/drawers.

Quote remains a commercial estimating product. Exact drilling, CNC, nesting and production drawings remain in Makster Pro.

## Scenario A — Typical fitted kitchen

Test set:
- base door cabinet;
- 2/3/4 drawer base;
- sink cabinet;
- hob cabinet;
- base oven;
- dishwasher 450/600;
- standard wall cabinets;
- Lift-Up/Aventos wall cabinet;
- integrated hood wall cabinet;
- tall oven / microwave / coffee machine;
- integrated fridge tall cabinet;
- fridge top cabinet;
- pantry;
- cargo 150/200/300;
- blind corner;
- LeMans / Magic Corner;
- open end section.

Result: **PASS for commercial Quote scope.**

Special hardware is not disguised as ordinary hinges. Cargo, Lift-Up and corner mechanisms are separate Price Book hardware roles. Hood and fridge-top presets close the two common appliance-zone gaps found during the audit.

## Scenario B — Wardrobe / fitted closet

Test set:
- long hanging section;
- double hanging section;
- shelves;
- shoe shelves;
- 3/4 drawer sections;
- shelves + hanging rail combination;
- open wardrobe section;
- top cabinet / mezzanine;
- sliding wardrobe 1200/1600/1800.

Result: **PASS for commercial Quote scope with explicit hardware pricing.**

Wardrobe rails and sliding-door systems are separate hardware roles in Price Book. Sliding presets replace ordinary hinge cost and hinge-cup operations; hanging rails are additive hardware.

Not modelled in Quote: exact rail drilling, sliding-system production geometry, exact corner-wardrobe carcass geometry. Those remain Makster Pro/custom-module territory.

## Scenario C — Bathroom furniture

Test set:
- wall-hung vanity with doors;
- wall-hung vanity with 2 drawers;
- wide 1200 vanity with 4 drawers;
- shallow wall cabinet;
- tall bathroom cabinet.

Result: **PASS for commercial Quote scope.**

Open backs for service zones are available where required. Exact basin cut-outs and plumbing drilling remain production detail, not Quote geometry.

## Price Book hardware roles required by the expanded library

- `cargo` — bottle/cargo pull-out set;
- `lift` — Lift-Up/Aventos set;
- `corner` — LeMans/Magic Corner set;
- `rail` — wardrobe rail + fittings;
- `sliding` — sliding-front track/roller set.

Accepted units for these roles: `pcs` or `set`.

## Phase 2 exit criteria

Phase 2 can be closed when:
1. all library presets compile and render;
2. each special mechanism can be priced independently;
3. a missing special-hardware price makes the module incomplete instead of silently pricing it at zero;
4. standard, favorite, recent and workshop-template library flows remain functional;
5. kitchen, wardrobe and bathroom audit scenarios remain representable without CNC/Makster Pro features;
6. GitHub CI passes TypeScript, PDF smoke and production build.
