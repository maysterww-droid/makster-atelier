# Makster 1.5 — Procurement Inbox & Connection Operations

## Purpose
Makster 1.5 turns Gmail sync and Supplier Communication into one owner-facing work queue. Users no longer have to open individual RFQs to discover replies or connection problems.

## Inbox item types
- `new_quote` — validated structured supplier quote already imported into Procurement.
- `needs_review` — freeform/incomplete reply. Makster does not invent missing price, lead time or services.
- `decline` — supplier declined the RFQ.
- `connection_alert` — Gmail connection needs sync/watch/reauthorization/error attention.

Each item has a deterministic `sourceKey`, stable `itemId`, severity and disposition (`new`, `acknowledged`, `resolved`, `dismissed`).

## Gmail connection operations
A trusted daily scheduler invokes `POST /api/v1/operations/connections/gmail/run`.

For every connected account Makster:
1. evaluates connection health;
2. performs a safety sync when the last successful sync is >=24h old;
3. only after sync, renews Gmail watch when the last renewal is >=24h old;
4. reevaluates health and creates owner-facing alerts when necessary.

The sync-before-renew order is intentional: renewing a watch first could advance the mailbox cursor before unseen history has been consumed.

## Health states
`healthy`, `sync_due`, `watch_renew_due`, `watch_missing`, `watch_expiring`, `reauth_required`, `error`, `revoked`.

`reauth_required`, connection errors, and imminently expiring watches are critical owner alerts.

## Owner notifications
New quotes, Needs Review replies, declines, and critical connection items create deduplicated owner notifications. Notifications reference the Inbox item rather than duplicating procurement data.

## Persistence model
Prepared Supabase migration adds:
- `gmail_sync_cursors.last_watch_renew_at`
- `procurement_inbox_dispositions`
- `owner_notifications`
- `connection_operations_runs`

Client roles receive read-only access through explicit grants + RLS. Mutations are server-side only.

## Scheduling
Do not hard-code service secrets in SQL. If Supabase Cron + `pg_net` is used, keep target URL/auth material in Supabase Vault and call a trusted server/Edge Function endpoint once daily.

## Safety rules
- A freeform supplier reply remains Needs Review until a human supplies/approves missing commercial facts.
- Connection failures never silently downgrade to “healthy”.
- `reauth_required` stops background Gmail operations until OAuth is repaired.
- Duplicate Gmail messages remain deduplicated by provider message ID in the underlying sync layer.
