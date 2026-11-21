# Makster AI 2.6.1 — Golden Project Hardening

Makster 2.6.1 keeps the persistent business core from 2.6 and hardens Kitchen Engineering against the first real Makster Atelier Golden Project. The lower kitchen run is owner-confirmed at 4190 mm; the system now models GTV hardware without Blum substitution, multiple appliances in one cabinet zone, stricter appliance envelopes, explicit hob/sink cutouts, wall-side worktop trim, grooved wall-cabinet backs and wall hangers.

**Project Revision → Visual/CAD → Kitchen Engineering → Production Pack → Commercial → Contract → Change Order → Production Gate**

Key 2.6.1 files:
- `GOLDEN_PROJECT_HARDENING_2_6_1.md`
- `RELEASE_NOTES_2_6_1.md`
- `KNOWN_LIMITS_2_6_1.md`
- `packages/project-model/examples/golden.kitchen.001.r4.2.6.1.json`
- `tests/golden-project-001-2.6.1.test.ts`

Windows: `START_MAKSTER_GOLDEN_2_6_1.cmd`

> Golden Project #1 intentionally remains Production HOLD until real GTV technical profiles, sink/hob cutouts, appliance envelopes and wall-trim dimensions are confirmed. This is fail-closed behavior, not a failed build.

---

## 2.5 Pro Engineering foundation retained

Makster AI 2.5 brings the strongest useful kitchen-engineering ideas from the earlier Makster Pro / Makster Calculator lineage into the current unified Core without reintroducing a second project database or a second pricing truth.

**ProjectModel Revision → Visual/CAD → Kitchen / Furniture Engineering → Production Pack / Procurement → Commercial Quote → Contract → Change Intelligence → Client Change Order → Production Gate**

## What 2.5 adds

### Kitchen Pro Engineering
- dedicated `kitchen-pro-engineering-v2.5` rule set;
- base / wall / tall kitchen modules;
- functions: storage, drawers, sink, hob, oven, dishwasher, fridge, hood, microwave, pantry, open;
- independent module height and depth;
- top / bottom / back construction flags;
- Gola, profile, push-to-open, handle or none as handle/opening intent;
- physical worktop parts and worktop cutouts;
- plinth parts and explicit adjustable-leg hardware requirements;
- appliance installation envelopes W×H×D with deterministic fit checking;
- dishwasher modeled as an appliance niche instead of an invented carcass;
- trusted current Blum drawer formulas for MOVENTO / LEGRABOX where an exact selection exists;
- paired two-leaf hinged fronts on one kitchen module plus single left/right fronts;
- material role validation for carcass / front / back / edge / worktop;
- explicit runner and leg selection validation.

### Kitchen Builder in Visual CAD
The Inspector now exposes a Kitchen Pro 2.5 editor. A normal furniture object can be converted to a real kitchen run, for example `600+600+600`, then edited per module. All completed edits go through typed Visual Commands and create immutable Project Revisions.

### Safety / manufacturing trust
The old Pro prototypes contained useful drilling UX and neutral DXF ideas, but their demo coordinates were not manufacturer-verified. 2.5 deliberately does **not** promote those coordinates to production truth.

- a CAD user cannot self-assert `CNC verified` on a worktop cutout;
- unverified worktop cutouts remain CHECK/REFERENCE for manual work;
- exact outsource drilling remains HOLD until trusted manufacturing data exists;
- runner drilling still requires manufacturer BXF/CAD-CAM data or a controlled verified profile;
- current Manufacturing Data Trust and Release Trust gates remain intact.

## Control kitchen
`packages/project-model/examples/kitchen.pro.v1.json`

1800 mm base run:
1. 600 sink base with paired fronts and sink worktop cutout;
2. 600 LEGRABOX drawer base;
3. 600 built-in oven base.

Current deterministic Engineering output:
- 30 physical panel parts;
- 2 paired sink-front leaves;
- 3 worktop parts;
- 4 Blum hinges;
- 12 adjustable kitchen legs;
- Production READY;
- CNC HOLD until the cutout and runner machining trust is resolved.

## Existing 2.4 business chain is preserved
- Production Pack 1.0;
- Supplier / Procurement / Gmail 1.1–1.5;
- Commercial Engine 1.6;
- Change Intelligence 1.7;
- Client Contract / Payment Schedule / Change Order 1.8;
- Business UI and commercial production gate.

## Windows run

```bat
START_MAKSTER_PRO_ENGINEERING_2_5.cmd
```

Then open `http://localhost:8787`.

The release contains compiled `dist`, so normal demo execution does not require TypeScript compilation first. Node.js 22+ is required.

## Verification

```bash
npm run typecheck
npm test
npm run engineering:kitchen
npm run production-pack:kitchen:manual
npm run production-pack:kitchen:outsource-edge
```

Final release verification: 150/150 automated tests PASS and HTTP Pro Engineering E2E PASS 23/23.

## Important boundary
Makster 2.5 is a stronger engineering foundation, not permission to send every generated file directly to a CNC machine. Exact manufacturer machining profiles, real machine postprocessors and physical reference-job validation remain mandatory before automated production release.

The 1.7/1.8 commercial contract/change-order persistence remains memory-mode in this local demo unless the prepared Supabase persistence is wired/deployed. Live Supabase was not modified by this release.
