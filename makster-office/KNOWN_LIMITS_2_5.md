# Known Limits — Makster AI 2.5

1. **Continuous worktop optimization** — 2.5 emits worktop parts per configured module. Automatic continuous-slab grouping, seam/joint placement, waterfall/end treatment and sheet/slab nesting are future rule packs.
2. **True special corner cabinets** — blind-corner, diagonal-corner, LeMans/Magic Corner and special L-carcass geometry still need dedicated Engineering rules. The existing L-layout is a grouped composition of real rectangular carcasses.
3. **Hettich production rules** — the old Pro UI exposed Hettich choices, but 2.5 does not claim exact Hettich drawer/drilling geometry without current manufacturer data. The tested deep path is current Blum logic.
4. **Appliance catalogue** — 2.5 validates explicit W×H×D installation envelopes. It does not yet ship a maintained Bosch/Siemens/Miele/etc. appliance catalogue/API.
5. **Gola machining/profiles** — Gola is preserved as design/construction intent. Exact aluminium profile part families, corner joints and machining rules need a dedicated supplier/manufacturer catalogue pack.
6. **Lighting/accessories** — Makster Pro library concepts such as lighting, baskets and cargo are not yet production-rule packs in 2.5.
7. **CNC trust** — old Pro prototype drilling coordinates are intentionally not treated as trusted machine data. Manufacturer BXF/CAD-CAM, catalogue or controlled manual verification is required.
8. **Persistent business storage** — the local demo still keeps 1.7/1.8 contract/change-order state in memory unless persistent repositories are deployed. This release does not alter live Supabase.
