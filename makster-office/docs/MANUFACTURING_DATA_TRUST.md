# Makster Manufacturing Data Trust Policy — Engineering 0.6

Makster separates **calculated construction rules** from **manufacturer-owned machining data**.

## Trust sources

Every machining operation may carry one of these sources:

- `makster_rule` — deterministic Makster construction rule (for example, configured back-panel groove or System 32 row);
- `manufacturer_catalog` — coordinates transcribed from an unambiguous current manufacturer technical drawing;
- `manufacturer_bxf` — coordinates imported from manufacturer BXF/manufacturing data;
- `manual_verified` — a profile independently checked and approved for the exact hardware SKU;
- `estimated` — incomplete/reference geometry; never eligible for CNC release;
- `fixture_only` — synthetic test data; only for automated tests and never for production.

## CNC release rule

`cncReady` is true only when:

1. Engineering has zero blocking/error checks.
2. Every required machining operation is exact (`estimated=false`).
3. There are no `reference_line` operations standing in for drilling.
4. Required hardware-specific manufacturing profiles are present.

The production default provider is intentionally fail-closed: if an exact runner profile is not loaded, it returns no drilling pattern and CNC remains on HOLD.

## Blum integration boundary

Blum's Cabinet Configurator / BXF workflow is the preferred source for exact manufacturer drilling data. Makster 0.5 defines the normalized import/storage contract, while a dedicated BXF importer is planned as the next integration layer.

## Fixture provider

`FixtureManufacturingDataProvider` exists only to prove that the coordinates → machining → CNC gate pipeline works end-to-end. Its coordinates are synthetic and marked `fixture_only`. Do not use its output on a machine.
