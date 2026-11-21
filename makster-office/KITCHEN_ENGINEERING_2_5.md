# Kitchen Engineering 2.5

## Supported modules
- base
- wall
- tall

## Supported functions
- storage
- drawers
- sink
- hob
- oven
- dishwasher
- fridge
- hood
- microwave
- pantry
- open

## Carcass
Kitchen carcasses reuse the deterministic modular-box compiler with per-module dimensions. This preserves established panel, edge, back-panel, drawer and hinge behavior while allowing kitchen-specific H/D and omissions.

## Sink
A sink module can remove the top and back while retaining real sides/bottom. The worktop cutout is a machining operation. It is not CNC-trusted merely because its W/D/X/Y are known.

## Dishwasher
The dishwasher function is an appliance reservation. Makster does not fabricate fictitious side panels around an under-counter appliance unless the project explicitly models a separate carcass.

## Drawers
Current tested path: Blum LEGRABOX / MOVENTO through existing HardwareSelection and Engineering rules. Exact runner drilling is fail-closed until manufacturer/verified data is present.

## Fronts
2.5 supports:
- none;
- one left-hinged leaf;
- one right-hinged leaf;
- paired two-leaf front on one module.

A paired 600 mm control front with 2 mm engineering front gap compiles into two 297 mm leaves.

## Worktop
Worktops are physical BOM panel parts. Cutouts have deterministic geometry. Continuous multi-module slab optimization and automatic joint placement are not yet implemented; see known limits.

## Appliance fit
When an appliance installation envelope is specified, Engineering compares it with the actual module opening/envelope. A non-fitting appliance creates `KITCHEN_APPLIANCE_DOES_NOT_FIT` and Production readiness becomes HOLD.
