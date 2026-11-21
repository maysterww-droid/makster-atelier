# Makster 1.8 — Contract Amount & Payment Schedule

> **2.4 integration note:** This module is now merged into Unified Business + CAD 2.4 and adapted to the active Commercial 1.6 `BuiltCommercialPackage` / `client_commercial_quotes` model. The conceptual trust rules below are preserved.

Payment schedules are explicit organization/customer policy, not hard-coded tax or furniture rules.

A schedule template is a list of labeled shares in basis points and must total 10,000 bps. Example used only in the demo: 50% deposit / 40% before delivery / 10% after installation.

When a customer accepts a Change Order:
- paid installments are frozen;
- remaining contract value is redistributed across unpaid installments according to their remaining relative weights;
- integer minor units are used throughout;
- rounding remainder is assigned deterministically;
- if the new contract total is lower than money already paid, automated acceptance-to-contract application is blocked for manual financial resolution.

Makster 1.8 does not process payments. It records contractual schedule and payment status only.
