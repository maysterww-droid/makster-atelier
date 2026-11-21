# Makster BXF Intelligence 0.6

## What BXF is

Blum describes BXF (Blum eXchange-Format) as a proprietary XML export from its configurators. It can contain fitting information, manufacturing information for wooden parts, drilling patterns and drilling positions. Blum also states that a detailed interface description is supplied to potential software partners through a Blum contact.

Current official references checked for this build:

- https://www.blum.com/cz/cs/services/faq/
- https://www.blum.com/cz/cs/services/planning-construction-product-selection/cabinet-configurator/
- https://www.blum.com/cz/cs/services/industrial-production/cad-cam-interface/
- https://publications.blum.com/2026/catalogue/en/626/
- https://publications.blum.com/2026/catalogue/en/627/

## 0.6 trust model

Makster does NOT infer a proprietary schema and then call the result manufacturer-verified.

Pipeline:

1. Raw XML ingest.
2. Reject DTD/ENTITY input.
3. Parse with size/node/depth limits.
4. Calculate SHA-256.
5. Calculate a schema fingerprint from element/attribute names.
6. Run registered BXF adapters.
7. Unknown structures become `inspection_only`.
8. Only a recognized trusted adapter may output normalized manufacturing profiles.
9. Engineering consumes the normalized profiles, not the raw XML.
10. Every generated runner machining operation carries BXF checksum, schema fingerprint, adapter id, hardware code and catalogue version.

## Import statuses

### `rejected`

Malformed XML, forbidden DTD/ENTITY, excessive size/depth/nodes, or another parser safety failure.

### `inspection_only`

XML was parsed and candidate SKU/drilling-like elements can be shown to a developer, but the schema is unknown. No CNC manufacturing profiles are created.

### `recognized`

A registered adapter explicitly recognizes the structure. The adapter may output normalized profiles with a declared trust source.

## Sources

`manufacturer_bxf` is reserved for a real adapter implemented from Blum-provided partner documentation or an independently validated manufacturer BXF export.

`fixture_only` exists solely for automated tests. It proves the pipeline but is never production evidence.

## Production adapter TODO

Implement a new `BxfAdapter`, for example:

`BlumOfficialBxfAdapter`

only after receiving the detailed Blum interface specification/sample exports. The adapter should:

- verify supported BXF/schema version;
- identify Blum project/configuration metadata;
- map exact hardware article numbers;
- extract wooden-part references;
- extract drilling patterns/positions with coordinate systems;
- normalize units;
- validate required fields;
- reject ambiguous coordinate transforms;
- emit `sourceKind: manufacturer_bxf`;
- preserve source SHA-256 and schema fingerprint.

No other Engineering code needs to change when that adapter arrives.

## HTTP API

`POST /api/v1/manufacturing/bxf/inspect`

Body:

```json
{
  "fileName": "project.bxf",
  "xml": "<?xml version=..."
}
```

`POST /api/v1/projects/:projectId/engineering/with-bxf`

Runs the same inspection and compiles Engineering with any recognized normalized profiles.

## CLI

```bash
npm run build
node dist/apps/bxf-cli/src/inspect.js my-project.bxf report.json
```

Engineering with BXF:

```bash
node dist/apps/engineering-cli/src/compile.js \
  packages/project-model/examples/wardrobe.blum.v1.json \
  engineering-output/my-project \
  --bxf path/to/project.bxf
```
