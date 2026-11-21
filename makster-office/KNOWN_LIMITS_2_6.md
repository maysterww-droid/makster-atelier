# Known Limits — Makster AI 2.6.0

- Live Supabase was not modified by the build; the 2.6 migration is prepared for staging first.
- Restart persistence is verified against the Supabase adapter contract with a deterministic fake PostgREST/RPC backend. A real staging Supabase restart test is still required before production rollout.
- Project/CAD persistence continues to use the existing Supabase ProjectRepository with user bearer/RLS; 2.6 does not redesign ProjectModel storage.
- Production approvals, supplier/procurement runtime maps and some other operational/demo state are outside the 2.6.0 business-persistence scope.
- Kitchen Engineering remains the 2.5 ruleset; 2.6.0 intentionally focuses on reliability/persistence rather than adding new kitchen geometry.
- Exact CNC manufacturing trust requirements remain unchanged.
