# Makster 1.4 — Gmail Live Sync

## Goal

Supplier replies should appear in Makster automatically without manually copying email text into Procurement.

The sync pipeline is:

```text
Gmail INBOX
  ↓
Gmail historyId / Pub/Sub signal
  ↓
Makster Gmail Sync
  ↓
exact thread / sender correlation
  ↓
existing Supplier Communication parser
  ↓
Quote candidate / Decline / Needs Review
  ↓
Procurement 1.2
```

## Incremental synchronization

Makster stores a Gmail `historyId` per connection. Normal synchronization calls Gmail History API starting at that cursor and fetches only newly added INBOX messages.

History IDs are cursors, not sequential counters. Makster never increments them itself.

If Gmail returns HTTP 404 because the saved history cursor is stale or invalid, Makster performs a **bounded full sync** of recent INBOX mail, re-establishes a fresh cursor, and records `fullSyncReason: stale_history`.

The fallback is intentionally bounded (`newer_than:14d` plus result limits) so a broken cursor cannot trigger an unbounded mailbox crawl.

## Message correlation

An inbound Gmail message is associated with an RFQ thread in this order:

1. exact Gmail provider `threadId`;
2. RFC `In-Reply-To` matching the RFQ root `Message-ID`;
3. RFC `References` containing the root `Message-ID`;
4. supplier sender + normalized Subject fallback.

Sender identity still has to match the invited supplier email before automatic quote import.

This prevents a message with a merely similar subject from becoming a supplier quote.

## Idempotency

Gmail provider message IDs already imported into a Supplier Communication thread are treated as seen IDs. A message received through both Pub/Sub-triggered sync and a retry/manual sync does not create a second quote.

## Classification

After correlation, Makster reuses the deterministic Supplier Communication 1.3 parser.

A validated structured response may become:
- `quote_candidate` → SupplierQuote imported;
- `declined` → RFQ supplier marked replied/declined;
- anything incomplete/freeform → `needs_review`.

Live Sync does not weaken the structured quote validation rules.

## Gmail push watch

Makster can create an INBOX watch using:

`POST /api/v1/connections/gmail/{connectionId}/watch`

The stored cursor includes:
- watch topic;
- Gmail history ID;
- watch expiration.

A production scheduler should renew the watch daily. Gmail requires watches to be renewed before expiration and at least once every seven days.

## Pub/Sub push endpoint

`POST /api/v1/connections/gmail/push`

The current application contract requires:

```text
x-makster-pubsub-secret: <server configured secret>
```

The Pub/Sub payload is decoded to:

```json
{
  "emailAddress": "supplier-mailbox@example.com",
  "historyId": "123456"
}
```

Then Makster resolves connected Gmail accounts for that mailbox and runs the same idempotent history sync.

### Production security boundary

The shared Makster header is an additional application gate, **not a substitute for Google-authenticated push identity**. Production should configure authenticated Pub/Sub push and validate Google/OIDC identity at the ingress/gateway/service boundary before forwarding to this endpoint.

## Scheduler responsibilities

A 1.4 production scheduler should:
- renew Gmail watches daily;
- run a periodic catch-up sync even when no push signal was received;
- retry transient Google/network failures;
- mark persistent refresh/auth failures as `reauth_required`;
- write sync events for observability.

## Current build boundary

The 1.4 code contains the live OAuth and Gmail API implementation, but this artifact was validated against mocked Gmail responses. No real Google OAuth client credentials, Gmail account, Pub/Sub topic, or live Supabase project were configured during the build.
