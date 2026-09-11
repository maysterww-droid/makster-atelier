# Makster Quote — Engineering Rules 0.1.2

This document freezes the commercial-engineering assumptions used by the Quote calculation engine. It is deterministic and intended for costing. It is **not yet a CNC/manufacturing release**.

## Supported modules

### B-Door

- 2 side panels: `H × D`
- 1 bottom: `(W - 2T) × D`
- 2 top stretchers: `(W - 2T) × stretcherDepth`
- configurable shelves: `(W - 2T) × (D - shelfSetback)`
- 1–4 overlay door fronts
- hinges are selected from Price Book and quantity is based on door height

Hinges per door:

- up to 900 mm: 2
- 901–1500 mm: 3
- 1501–2100 mm: 4
- above 2100 mm: 5

### B-Drawer

- 2 side panels: `H × D`
- 1 bottom: `(W - 2T) × D`
- 2 top stretchers: `(W - 2T) × stretcherDepth`
- 1–8 equal-height overlay drawer fronts
- one selected drawer-system set per drawer

### Generic

- 2 side panels
- bottom
- full top
- optional shelves
- no front/hardware assumptions

## Front gaps

`gapMm` is used as the external and intermediate overlay-front gap.

Door width for N equal doors:

`(W - (N + 1) × gap) / N`

Drawer-front height for N equal drawers:

`(H - (N + 1) × gap) / N`

Front edging can be treated as included in the front price or added to the cabinet edge-band quantity.

## Back panel

Modes:

- `none` — no back panel
- `overlay` — full outside `W × H`
- `groove` — costing geometry: `(W - 2×inset + 2×grooveDepth) × (H - 2×inset + 2×grooveDepth)`

Groove geometry is deliberately marked as costing geometry. Exact groove reference planes and CNC coordinates belong to the future production profile.

## Edge banding

For carcass parts, the current default is the visible front edge of:

- both side panels
- bottom
- each stretcher / top
- each shelf

Front perimeter is added only when the user says front edging is not included in the front price.

## Price Book operation keys

- `cutting` — quantity = rectangular part count
- `edge-banding` — quantity = edge-band metres
- `carcass-drilling` — quantity = carcass-board part count
- `hinge-cup` — quantity = hinge count
- `drawer-drilling` — quantity = drawer count
- `back-groove` — quantity = back-panel perimeter metres when groove mode is used

Supported operation pricing units:

- `pcs` for piece-based operations
- `m` for linear operations
- `job` for a fixed charge per cabinet

If a required operation has no Price Book row, the engine reports the calculation as incomplete instead of silently pricing it at zero.

## Material costing

Sheet material is allocated by used area plus the `wastePct` stored on the Price Book item. This is not a sheet nesting optimiser and does not round every cabinet to whole sheets, because offcuts may be shared across cabinets in one project.

## Project total

The cabinet editor shows the sum of saved cabinet `trueCostMinor` and `netSalesMinor` values as the current project total.

Delivery and installation remain project-level items and are intentionally not allocated to individual cabinets in 0.1.2.
