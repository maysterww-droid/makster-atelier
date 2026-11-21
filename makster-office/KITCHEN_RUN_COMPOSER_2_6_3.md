# Makster AI 2.6.3 — Kitchen Run Composer

Kitchen Run Composer turns the 2.6.2 Kitchen Module Library into an exact run-layout engine.

## Rules
- Required appliance/service modules are placed first and never silently resized.
- Automatic capacity is filled from workshop standard widths.
- Any non-standard remainder is represented explicitly as a technical/site-fit filler.
- Base, wall and tall libraries cannot be mixed in one run by mistake.
- The sum of generated modules must equal the requested run width exactly.
- Output is normal `FurnitureModule[]` + `FrontSpec[]`, so the existing Engineering Engine remains the single production calculation path.

## 2.6.3 API
- `composeKitchenRun(input)`
- `applyKitchenRunComposition(furniture, composition)`

Golden Project #1 is covered by regression as a 4190 mm composed run with the R14 module sequence.
