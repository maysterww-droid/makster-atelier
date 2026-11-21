# Makster AI 2.7.9 — Catalog Import Pipeline

## Purpose

2.7.9 removes the manual bottleneck from Hardware & Appliance Master Catalog.

Pipeline:
Source → parse/extract → staging candidates → review → explicit promotion → runtime master catalog.

## Supported import paths

### Direct core parsing
- JSON
- CSV
- conservative BXF/XML attribute extraction

### Adapter-driven extraction
- PDF
- XLSX

Raw PDF/XLSX bytes are intentionally NOT heuristically parsed by core.
A PDF/XLSX extractor supplies `extractedRows`, then the same staging/trust pipeline applies.

This avoids the unsafe pattern:
OCR/Excel guess → automatic trusted production data.

## Staging trust

Every imported candidate starts as:
- trust: imported_unverified
- productionEligible: false
- source evidence retained
- confidence + warnings retained
- drillingProfile: not_imported for hardware

## Promotion

Promotion requires:
- reviewedBy
- target trust
- explicit manufacturerEvidenceConfirmed for manufacturer_verified / project_verified

An imported drilling profile reference is NOT automatically trusted during promotion.
Drilling remains `not_imported` unless a separate drilling-profile approval/import process exists.

## Dynamic runtime catalog

Promoted records can be registered into the running master catalog and immediately become searchable by:
- catalog search
- compatibility engine
- auto-selection

Persistent database-backed promotion is still a later storage layer; 2.7.9 provides the safe import/normalize/review/promotion engine.

## API

POST /api/v1/catalogs/import
POST /api/v1/catalogs/import/promote

## UI

Catalog tab now contains Catalog Import Pipeline:
- target: hardware/appliance
- format: csv/json/bxf/xlsx/pdf
- manufacturer
- source filename
- source text
- staging result preview

PDF/XLSX UI currently expects extractor-adapter rows rather than raw binary parsing.
