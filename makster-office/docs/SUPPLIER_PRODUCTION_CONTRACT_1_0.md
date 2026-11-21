# Supplier Production Contract 1.0

A Makster outsource package is tied to one `projectId + revision + engineeringInputChecksum`.

The supplier must receive only the services selected in the manifest. If a newer revision exists, the old package must be cancelled or explicitly kept as a separate order.

## Cutting

Use final dimensions from `cutlist.csv`; preserve grain direction. Keep `part_id` on each returned panel.

## Edging

Only edge sides listed in `edging.csv`. Missing catalog edge mapping is a warning requiring material confirmation, not permission to guess the decor.

## Drilling

A full drilling order is `ready=true` only when no `OUTSOURCE_DRILLING_NOT_EXACT` blocker exists. Rows marked CHECK/REFERENCE are never valid outsourced production coordinates.

## Traceability

`production-pack-manifest.json` carries SHA-256 hashes for all payload files, allowing the sending workshop and supplier to prove they are working from the same package.
