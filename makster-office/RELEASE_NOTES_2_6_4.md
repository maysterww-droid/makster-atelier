# Makster AI 2.6.4 — Kitchen Layout Planner

Added `packages/engineering-engine/src/kitchen-layout-planner.ts` and exported it from Engineering Engine.

New capabilities:
- straight, L, U, parallel and island planning;
- run transforms in ProjectModel coordinates;
- aisle and island-clearance guards;
- utility-point proximity validation for sink, dishwasher, oven/hob, fridge and hood;
- ProjectModel bridge that expands one kitchen template into multiple production runs;
- safe front/module ID remapping;
- ruleset bumped to `kitchen-pro-engineering-v2.6.4`;
- regression test file `tests/kitchen-layout-planner-2.6.4.test.ts`.

Verification performed in build environment:
- strict TypeScript check for ProjectModel + Engineering Engine passed with a minimal local Node crypto declaration because the packaged project does not include `node_modules/@types/node`;
- layout smoke tests passed for L, narrow parallel aisle, island fit/no-fit and utility warning;
- Golden Project #1 U-layout bridge compiled through MaksterEngineeringCompiler;
- Golden U result: 3 runs, 3 furniture items, 79 generated parts, no MODULE_WIDTH_SUM_MISMATCH, ruleset 2.6.4.

Full `npm test` was not re-run because `@types/node` is not bundled in the source ZIP and dependency installation timed out in the isolated build environment. No green full-regression claim is made for 2.6.4.
