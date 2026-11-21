# Requote Data Trust 1.7

> **2.4 integration note:** This module is now merged into Unified Business + CAD 2.4 and adapted to the active Commercial 1.6 `BuiltCommercialPackage` / `client_commercial_quotes` model. The conceptual trust rules below are preserved.

Makster does not reconstruct old commercial assumptions from totals. Deterministic requote requires the original source context. `commercial_quotes.source_context_json` stores the exact pricing inputs server-side for quotes created from 1.7 onward.

Existing historical quotes without source context remain readable but must be manually re-baselined before automatic Requote.

Customer-facing proposals never expose `source_context_json`, internal cost lines, cost basis or gross profit.
