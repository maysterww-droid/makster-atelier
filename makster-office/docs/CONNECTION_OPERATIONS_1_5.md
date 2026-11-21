# Gmail Connection Operations 1.5

Makster uses Gmail Push/History for near-real-time operation and a daily safety loop for resilience.

## Daily job
Call `/api/v1/operations/connections/gmail/run` from trusted server infrastructure. The job is idempotent at the policy level: operations only execute when due.

### Safety sync
Due when no successful sync exists or `last_sync_at` is at least 24 hours old. Gmail History is used first; stale history IDs fall back to bounded full sync.

### Watch renewal
Due when no renewal timestamp exists or `last_watch_renew_at` is at least 24 hours old. The existing `historyId` is preserved while watch expiration is refreshed.

### Reauthorization
If refresh-token decryption or Google refresh fails, connection status becomes `reauth_required`. Background operations stop until the owner reconnects Gmail.

## Deployment note
Supabase Cron can invoke an Edge Function or HTTP endpoint. Use Vault for endpoint/auth secrets. Keep the Gmail refresh-token encryption key outside the database (KMS/server secret).
