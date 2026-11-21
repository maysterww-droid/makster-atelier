# Makster AI 2.7.2 — Hardware & Appliance Master Catalog

## What is new

Makster now has a unified catalog layer for hardware and appliances.

### Hardware
- manufacturer registry: Blum, Hettich, Häfele, GTV, GRASS, Salice;
- normalized records: manufacturer, family, role, code/SKU, planning data, source, trust level;
- drilling trust gate:
  - manufacturer/project verified + explicit profile → may authorize drilling;
  - SKU/planning-only data → never authorizes CNC/drilling automatically;
- existing Blum and GTV project profiles are retained rather than translated into another manufacturer's geometry.

### Appliances
Initial manufacturer-verified records:
- Bosch SMV6ZCX10E fully integrated dishwasher;
- Siemens SN65ZX07CE fully integrated dishwasher;
- Miele G 7191 SCVi AD 125 Edition dishwasher;
- Liebherr IRBd 5120 integrated refrigerator.

Expansion manufacturer registry:
NEFF, AEG, Electrolux, Whirlpool, Samsung, LG, Beko.

Every verified appliance record stores manufacturer/model, kind, installation mode, measured envelope/niche facts, source and trust.
Unknown installation constraints remain unknown.

### API
- GET /api/v1/catalogs/hardware
  - filters: manufacturer, q, role, productionReadyOnly
- GET /api/v1/catalogs/appliances
  - filters: manufacturer, q, kind

This is a master catalog foundation, not a claim that every brand's complete worldwide catalog is already imported.
