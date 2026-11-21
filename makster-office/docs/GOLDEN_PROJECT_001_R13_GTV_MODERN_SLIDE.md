# Golden Project #001 — Revision 13 — GTV Modern Slide profile

## What changed

Revision 13 removes the temporary `Blum-equivalent GTV` sizing assumption and gives GTV Modern Slide its own technical profile in ProjectModel and Engineering.

Verified family planning rules used by Makster:

- `SKW = LW - 49` for GTV Modern Slide timber drawers.
- `SKL = NL - 10`.
- Supported drawer-side board thickness up to 19 mm.
- Manufacturer planning drawing shows maximum bottom recess 13 mm.
- The Golden Project owner confirmed 18 mm particleboard drawer sides, 500 mm slides, 3 mm HDF/DVP bottom and manual-template installation.

The exact historical SKU used in this old kitchen is not claimed. The profile is stored as the verified **GTV Modern Slide 18 mm family** geometry, not as a guessed product code.

## Golden Project geometry

Cabinet external width: 600 mm  
Carcass sides: 18 + 18 mm  
Clear cabinet width `LW`: 564 mm  
GTV inner drawer width `SKW`: 564 - 49 = **515 mm**  
Drawer side thickness: 18 mm  
Finished outer drawer-box width: 515 + 18 + 18 = **551 mm**  
Nominal slide length `NL`: 500 mm  
Drawer-box depth `SKL`: 500 - 10 = **490 mm**

## Shop groove profile

Owner-approved Makster shop rule for this project:

- HDF/DVP: 3 mm
- groove width: 3 mm
- groove depth: 10 mm
- lower-face bottom recess: 13 mm
- box joint: front/back between sides
- runner and hinge installation: manual physical template

Derived HDF/DVP cut for each drawer under that joint convention:

- width: 515 + 10 + 10 = **535 mm**
- depth: 490 - 18 - 18 + 10 + 10 = **474 mm**

No GTV CNC runner drilling coordinates are generated from this profile. Dimensional cut sizing is verified; drilling remains `manual_template`.

## Golden Project R13 status

Engineering compilation:

- panel parts: 88
- machining operations: 0 for the manually-installed GTV / on-site cutout workflow
- blocking issues: 2
- remaining blockers are only the oven and hob confirmed installation envelopes (W×H×D)
- sink and hob worktop cutouts are explicitly `on_site` and do not create workshop CNC operations

## Regression

Full Makster regression after the R13 profile patch: **174/174 PASS**.
