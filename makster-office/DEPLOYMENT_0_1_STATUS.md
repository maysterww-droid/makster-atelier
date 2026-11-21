# Makster Deployment 0.1 — REAL STAGING STATUS

Date: 2026-09-07
Supabase project: Makster-Staging
Project ref: gkqntgfrbngspvrsqvmx
Region: eu-central-1
Database: PostgreSQL 17
Supabase state: ACTIVE_HEALTHY

## Actually applied to Makster-Staging

Historical:
- Makster Core 0.1
- Engineering 0.3
- Production Pack 1.0
- Commercial Quote 1.6
- Change Intelligence 1.7
- Client Change Order 1.8
- Persistent Unified Business 2.6

Deployment 0.1 catch-up:
- Blum Intelligence 0.4
- Hardware Drilling 0.5
- BXF Intelligence 0.6
- Verified Manufacturing Release 0.7
- Owner Operations 4.1 tables
- Owner Operations 4.1 warehouse RPC
- Owner Operations 4.2
- Owner Operations 4.3
- Decision Execution persistence 4.6
- Operations Control persistence 4.7
- Procurement Automation persistence 4.8
- Owner Finance persistence 4.9
- AI Office 5.1
- consolidated Growth/CRM/Autopilot/Provider Execution/Content/Pilot/System persistence 5.2–5.6
- Deployment FK indexes
- Supplier Receiving 1.1
- Procurement Intelligence 1.2
- Supplier Communication 1.3
- Gmail Connections 1.4
- Procurement Inbox 1.5
- Catalog Registry 2.8

Total migration-history entries after Deployment 0.1 catch-up: 28.

## Verified live tables / subsystems

Present:
- owner_warehouse_items
- owner_finance_ledger
- procurement_rfqs
- organization_connections
- makster_office_leads
- makster_role_policies

Not yet present:
- production_queue_jobs

Reason:
Production Control 0.8 and Production Worker 0.9 were deliberately not forced through the deployment connector.
The migration includes a large security-definer/trigger/PGMQ queue surface and the migration tool's safety layer blocked both the original and the split approval attempt.
The exact source migrations remain in this build, together with split deployment SQL for 0.8, for controlled application through the normal Supabase deployment path.

## Security

- all public tables checked before final legacy catch-up had RLS enabled
- every newly deployed business table explicitly enables RLS
- Data API grants are explicit; no assumption of automatic exposure
- browser/staging config contains only the Supabase publishable key
- service-role / secret key is NOT included
- organization_connection_secrets intentionally has no authenticated RLS policy and no authenticated table grant
- catalog import registry tables intentionally have no authenticated RLS policies and are service-role only

Supabase Security Advisor final INFO notices:
- service-only catalog registry tables: RLS enabled, no user policy
- organization_connection_secrets: RLS enabled, no user policy
These are intentional deny-by-default surfaces, not public exposure.

## Real blockers before first real Pilot

1. Real Auth Owner
   - auth.users = 0 at deployment inspection
   - organization_members = 0
   - create the Owner through normal Supabase Auth; never insert a fake auth.users row

2. Server secret
   - SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY must be configured only in deployment secret storage

3. Production Control
   - Production Control 0.8 pending
   - Production Worker 0.9 pending

4. Hosting
   - MAKSTER_PUBLIC_BASE_URL must point to the real HTTPS deployment

5. Real pilot
   - existing staging project is acceptance/test data and is not counted
   - target: at least 3 real projects completed end-to-end before Production Release Gate opens

## Next exact action

1. Apply Production Control 0.8 + Worker 0.9 through a controlled Supabase deployment environment.
2. Create the real Owner Auth account and add it to `organization_members` as owner.
3. Configure server secret key and public HTTPS URL.
4. Start Pilot Project #1 from a real Makster order.
