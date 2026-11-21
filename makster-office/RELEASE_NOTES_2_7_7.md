# Makster AI 2.7.7 — Catalog Traceability & Production Binding

## Purpose

2.7.7 carries catalog provenance from approved assignment into Engineering.

Each assigned hardware/appliance can now retain:
- catalogRecordId
- manufacturer/model or code
- catalogTrust
- catalogSource

EngineeringCompileResult now exposes:
- catalogTraceability[]

For hardware, traceability also reports whether the catalog record itself is allowed to authorize drilling.

## Why this matters

A BOM line is not enough for production trust.
Makster must be able to answer:
- which catalog record produced this assignment?
- what source was used?
- was it manufacturer/project verified?
- is drilling actually authorized?

## UI

Engineering tab now shows a Catalog Traceability card for assigned catalog-backed hardware and appliances.

## Safety

Traceability never upgrades trust.
If a record has no trusted drilling profile, productionDrillingAuthorized remains false even when the SKU is known.
