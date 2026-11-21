# Visual Command Trust Policy — 2.0

The Visual Product endpoint accepts domain commands, not arbitrary patch paths.

## Why

A generic client-controlled JSON Patch surface could change protected or semantically unrelated fields. The visual editor therefore sends a constrained intent such as:

```json
{
  "type": "move_module_divider",
  "leftModuleIndex": 2,
  "deltaMm": 60
}
```

Trusted Makster code decides the exact paths to modify.

## Atomic divider rule

A divider drag changes exactly two adjacent fixed module widths in one revision:

- `left = left + delta`
- `right = right - delta`

Both widths must remain >= 100 mm and the combined width remains unchanged.

## Geometry units

UI values are entered in millimetres. The ProjectModel stores canonical integer `0.1 mm` units. Equal module distribution is performed in integer canonical units so the sum exactly equals the furniture overall width.

## Validation

Invalid geometry, stale revisions, missing furniture/modules and impossible divider operations are rejected. The normal ProjectModel semantic validator runs before a revision is committed.
