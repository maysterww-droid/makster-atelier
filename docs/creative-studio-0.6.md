# Creative Studio 0.6 — Persistence, API and Workspace

The studio now has a repository contract, an in-memory implementation for zero-risk tests, an application API facade and a workspace model with Brief, Concept, Script, Storyboard, Shots, QA, Approval and Exports tabs. Optimistic versioning prevents silent overwrites.

A Supabase schema proposal is included but is intentionally not executed against a live project yet. It uses owner-scoped RLS on the exposed `public` table, revokes anonymous table access, and grants authenticated CRUD subject to RLS. This follows current Supabase guidance that exposed tables must have RLS and that UPDATE needs both SELECT visibility and USING/WITH CHECK ownership rules.

No service-role key is used in client code. No production database was changed.
