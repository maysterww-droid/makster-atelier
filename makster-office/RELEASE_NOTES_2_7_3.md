# Makster AI 2.7.3 — Catalog Intelligence & Compatibility Engine

## Purpose

2.7.3 turns the 2.7.2 master catalogs into an engineering decision layer.

Makster can now answer:
- does this hardware record match the requested role?
- is the verified front thickness compatible?
- does requested runner nominal length match the catalog record?
- does expected dynamic load exceed the verified rating?
- may this exact hardware record authorize production drilling?
- does an appliance fit a verified niche width/height/depth?
- is manufacturer-required ventilation sufficient?
- which same-kind catalog records remain non-blocking alternatives?

## Compatibility states

- COMPATIBLE — all requested checks that have verified data pass.
- CONDITIONAL — only warnings remain.
- INCOMPATIBLE — at least one verified hard constraint fails.
- UNKNOWN — the catalog does not contain enough normalized verified data for the requested check.

UNKNOWN is intentional and safer than fabricated compatibility.

## Production trust

A known SKU does not automatically authorize drilling.
Production drilling is allowed only where a trusted manufacturer/project drilling profile is explicitly attached.

Example:
- Blum MOVENTO 760H 550 SKU can be known for BOM/planning while drilling stays blocked.
- Existing GTV Modern Slide project profile remains separately trusted.
- No manufacturer geometry is substituted with another brand.

## Appliance facts currently normalized for compatibility

- Bosch SMV6ZCX10E: 600 mm niche width, 815–875 mm niche height, min. 550 mm niche depth.
- Miele G 7191 SCVi AD 125 Edition: 600 mm installation width, 805–870 mm height, min. 560 mm depth.
- Liebherr IRBd 5120: 560–570 mm niche width, 1772–1788 mm height, min. 550 mm depth, min. 200 cm² ventilation.
- Siemens SN65ZX07CE remains searchable, but niche compatibility is intentionally UNKNOWN until its exact installation drawing is separately normalized.

## API

POST /api/v1/catalogs/hardware/compatibility
POST /api/v1/catalogs/appliances/compatibility

## UI

New Catalog tab in web demo:
- Hardware / Appliances switch
- record selection
- hardware context inputs: front thickness, nominal runner length, expected load, production drilling requirement
- appliance context inputs: niche W/H/D and ventilation
- compatibility result, issue codes and non-blocking alternatives
