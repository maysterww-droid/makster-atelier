# Makster 1.4 — Gmail Connections

## Purpose

Makster 1.4 adds organization-scoped Gmail connections for Supplier Communication. A user authorizes one Gmail account with Google OAuth; Makster stores connection metadata separately from encrypted secret material and refreshes short-lived access tokens only on the server.

## Security boundary

The browser may see:
- connection ID;
- organization ID;
- Gmail account email;
- granted scopes;
- connection status;
- history cursor / watch expiration metadata.

The browser must never receive:
- Google OAuth client secret;
- refresh token;
- decrypted secret material;
- Supabase secret/service-role key;
- Makster connection encryption key.

Makster deliberately does **not** persist Gmail access tokens. They are short-lived and are obtained server-side when a Gmail operation is executed.

Refresh tokens are encrypted in application code with AES-256-GCM before persistence. `organization_connection_secrets` is server-only and receives no `anon` or `authenticated` table privilege.

## OAuth flow

1. Browser calls `POST /api/v1/connections/gmail/oauth/start`.
2. Makster creates a signed, short-lived OAuth state bound to the organization and a relative return URL.
3. Browser is redirected to Google's authorization endpoint.
4. Google redirects to `GET /api/v1/connections/gmail/callback`.
5. Makster verifies state before exchanging the authorization code.
6. Makster calls Gmail profile to identify the authorized mailbox.
7. Refresh token is AES-256-GCM encrypted and persisted server-side.
8. Access token is discarded after the immediate operation.
9. If Pub/Sub is configured, Makster starts an INBOX watch and stores its history cursor / expiration.

The requested Gmail scopes are intentionally limited to:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
```

### Google verification requirement

`gmail.send` is a sensitive scope and `gmail.readonly` is a restricted scope. Makster needs `gmail.readonly` because the Supplier Communication parser must read the supplier reply body; metadata-only access is insufficient for automatic quote/decline parsing. A public commercial deployment must plan for Google's OAuth verification requirements, and restricted-scope use may require recurring third-party security assessment under Google's current policy. This is a launch/compliance requirement, not something the source code can bypass.

The OAuth authorization request uses `access_type=offline` so a refresh token can support background synchronization. Re-consent can be requested when Google does not return a refresh token and no previous encrypted refresh token exists.

## Required server environment

```text
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://<makster-host>/api/v1/connections/gmail/callback
MAKSTER_OAUTH_STATE_SECRET=
MAKSTER_CONNECTION_ENCRYPTION_KEY_B64=
MAKSTER_CONNECTION_KEY_VERSION=v1
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

Optional push sync:

```text
GOOGLE_GMAIL_PUBSUB_TOPIC=projects/<project>/topics/<topic>
MAKSTER_GMAIL_PUBSUB_SHARED_SECRET=
```

`MAKSTER_CONNECTION_ENCRYPTION_KEY_B64` must decode to exactly 32 random bytes. Production should keep it in a deployment secret manager/KMS-backed secret system, not in Supabase tables or source control.

## Connection states

```text
pending
connected
reauth_required
revoked
error
```

If refresh-token decryption or Google token refresh fails, the connection is not treated as healthy. It transitions to `reauth_required` or error handling instead of silently continuing.

## Supabase storage

Prepared migration:

`supabase/migration_source/makster_connections_gmail_1_4.sql`

Tables:
- `organization_connections` — non-secret metadata;
- `organization_connection_secrets` — encrypted refresh token only, server-only;
- `gmail_sync_cursors` — history/watch cursors;
- `gmail_sync_events` — sync audit trail.

Supplier communication threads gain `connection_id`; messages gain `provider_history_id`.

The migration is prepared only and is not applied to a live Supabase project by this build.

## Disconnect

Disconnect attempts to:
1. refresh an access token;
2. stop Gmail watch;
3. revoke the Google token;
4. mark the Makster connection `revoked`.

A revocation network failure does not make Makster pretend the connection is still usable; local connection state still stops normal use.

## Production deployment notes

- Keep OAuth redirect URIs exact and HTTPS in production.
- Do not put `GOOGLE_OAUTH_CLIENT_SECRET`, `SUPABASE_SECRET_KEY`, refresh tokens, or encryption keys into `NEXT_PUBLIC_*`/browser bundles.
- Rotate the AES key by incrementing `MAKSTER_CONNECTION_KEY_VERSION` and re-encrypting stored refresh tokens in a controlled server migration.
- For organization authorization, production routes must resolve the authenticated user's organization membership server-side; demo fallback organization IDs are not a production authorization model.
