# R14 Site-fit appliance patch

Adds `KitchenApplianceSpec.fitMode`:

- `preverified` (default): exact confirmed W×H×D required.
- `site_fit`: final appliance fit is intentionally verified on site. Missing envelope dimensions do not block Engineering; known dimensions are still hard-fit checked.

Also upgrades the manual Production Pack checklist to surface site-fit, on-site cutouts and manual-template hardware operations.

Golden Project #1 R14 has zero Engineering blockers. Its manual Production Pack remains fail-closed because 18 historical drawer panel rows still depend on defaulted/estimated drawer heights.
