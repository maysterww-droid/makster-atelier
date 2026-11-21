# Makster AI 2.6.5 — Kitchen Constraint & Corner Engine

## Added
- Production-aware obstacle collision checks for doors, windows/radiators/columns/boilers/ducts and custom obstacles.
- Explicit opening/door swing clearance zones.
- Corner decision engine for blind, carousel, LeMans and diagonal base corners.
- Four reusable corner modules in Kitchen Module Library.
- Constraint result with blocking/warning issues, readiness and score.
- Regression scenarios for corner selection, radiator collision and door swing collision.

## Manufacturing principle
The constraint layer consumes measured/provided geometry only. It does not invent site dimensions or hidden utility positions. Existing Kitchen Layout Planner → ProjectModel → Engineering Engine remains the manufacturing authority.
