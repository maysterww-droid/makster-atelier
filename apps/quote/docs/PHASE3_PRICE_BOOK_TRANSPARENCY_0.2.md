# Makster Quote — Phase 3 Price Book Onboarding & Cost Transparency 0.2

## Goal
Make workshop costing understandable before a user creates a commercial quote: show which Price Book data is still missing, allow safe exploration with clearly marked DEMO data, and explain where every module cost comes from.

## Price Book readiness
The Price Book page now evaluates eight setup areas:
1. carcass + back-panel material defaults;
2. fronts;
3. edge band;
4. hinges;
5. drawer systems;
6. production operations;
7. labour rate;
8. optional extras (worktop, plinth, fillers/decor, delivery, installation).

Required production operations are:
- cutting;
- edge-banding;
- carcass-drilling;
- hinge-cup;
- drawer-drilling;
- back-groove.

A required step is `ready` only when the selected/default price is real. A DEMO default is shown as `demo`, not ready. The production-operation step is ready only when every required operation key has at least one non-DEMO price.

## DEMO Price Book
Owners/admins may create an illustrative DEMO Price Book to explore the workflow. DEMO items are explicitly marked in `parameters_json.demo` and in the UI.

Guardrail: any module calculation that uses a DEMO item receives a warning and `complete=false`. This lets users see an illustrative cost while preventing that module from satisfying commercial quote readiness. Existing project publishing logic already blocks quotes with incomplete modules.

DEMO data must never be presented as a market price or supplier price.

## Defaults
Workshop defaults remain under Settings → Pricing. The Price Book onboarding links directly to `#price-book-defaults` so the user can assign carcass, back, fronts, edge, hinges, drawer systems and labour defaults.

The carcass/material readiness step requires both a valid carcass default and a valid back-panel default. Cabinet geometry remains authoritative for the back-panel thickness (4 mm in standard presets); the Price Book item supplies costing data.

## “Where does this price come from?”
The module editor now exposes a cost-transparency panel containing:
- selected Price Book item name;
- usage quantity;
- unit price source;
- calculated line cost;
- carcass area;
- back-panel area;
- front area;
- edge length;
- hardware lines;
- production operation lines;
- direct labour;
- direct cost;
- overhead;
- true cost;
- recommended selling price and margin.

For sheet materials it also displays the commercial allocation formula: used area → allocated sheet fraction, including the configured waste percentage. This is commercial costing transparency, not nesting/sheet optimisation.

## Boundaries
Phase 3 does not move CNC, drilling coordinates, exact hardware boring, nesting, or production drawings into Makster Quote. Those remain Makster Pro responsibilities.

## Exit criteria
Phase 3 can be closed when:
1. the eight-step Price Book readiness panel renders in RU/EN/CS/DE/PL;
2. real and DEMO data are distinguishable;
3. all six required operation keys need real prices before the operations step is ready;
4. DEMO-driven module costing is visibly incomplete and therefore cannot be published;
5. setup links reach the Price Book add form and Pricing defaults section;
6. the module cost-transparency panel shows source, quantity/formula and result;
7. the existing margin/overhead formula remains unchanged;
8. TypeScript, PDF smoke and production build pass in CI.
