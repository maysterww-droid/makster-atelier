# Creative Studio 1.1 — Live Makster Module Library wiring

The Studio Asset Bridge is now mapped to the actual Makster-Staging Supabase library discovered on 2026-09-17: `public.ready_module_library` backed by the public `makster-library` storage bucket. The live view exposes READY module metadata plus preview, GLB, module.json, motion.json and validation-report storage paths.

A read-only live query verified multiple READY module rows, including the 600 mm base-door instance at version 57. Its body height is 720 mm with 100 mm legs, so Creative Studio maps the physical reference height to 820 mm.

Important separation: current rows can be `release_status=READY` while `production_status=REQUIRES_VERIFICATION`. Creative Studio may use those validated visual assets as product references, but it must surface production blockers as warnings and must never imply manufacturing approval. This preserves the distinction between creative truth and manufacturing readiness.

No schema, RLS, storage object or production data was modified in Supabase. No generation credits were used.
