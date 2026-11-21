# Kitchen Ergonomics & Design Intelligence 2.6.8

The ergonomics engine consumes `KitchenMixedHeightPlan` and never manufactures cabinet geometry itself. Its job is to explain whether a technically placeable kitchen is also usable.

The engine evaluates configurable thresholds rather than pretending every market, appliance or client has one universal ergonomic number. Defaults are deterministic and can be overridden by project/manufacturer policy.

Current checks cover preparation surface, dishwasher proximity, actual work triangle, appliance/front opening envelopes, opposing-run clearance and wall-cabinet vertical reach. Blocking findings can reject an ergonomic candidate; warnings remain visible in the score breakdown.
