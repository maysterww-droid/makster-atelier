> **Superseded in Makster 1.4:** the manual `GMAIL_OAUTH_ACCESS_TOKEN` prototype is retained here only as historical 1.3 documentation. Runtime 1.4 uses organization-scoped OAuth Connections and server-side refresh-token encryption; do not configure the old token variable.

# Makster 1.3 — Supplier Communication

## Goal
Turn Procurement RFQs into an auditable communication flow without letting email text become engineering or pricing truth by itself.

## Flow

1. A READY outsource Production Pack creates an RFQ.
2. Each invited supplier gets one Makster communication thread.
3. Makster composes an RFQ email containing project revision, required services, response deadline and a deterministic response token.
4. A provider sends the message. 1.3 includes MemoryEmailProvider for tests and GmailApiEmailProvider for runtime integration.
5. Provider message/thread IDs and the RFC Message-ID are stored with the thread.
6. Supplier replies are ingested into the same logical RFQ thread.
7. Only a complete `MAKSTER QUOTE ... END MAKSTER QUOTE` block with matching RFQ ID and response token can become a SupplierQuote automatically.
8. Freeform/incomplete replies become `needs_review`; Makster does not invent price or lead time.
9. A deterministic reminder engine identifies unanswered threads after 48 hours, repeats at most twice, and stops after any reply/decline.

## Gmail

The Gmail adapter sends RFC 2822 MIME data through `users.messages.send` as base64url `raw`. For follow-ups it preserves Gmail `threadId`, subject and RFC `In-Reply-To`/`References` headers.

Runtime environment variable used by the current prototype:

```text
GMAIL_OAUTH_ACCESS_TOKEN=
```

This is a short-lived integration surface for the prototype. Production OAuth must use Makster Connections / token refresh and a secret store. Do not persist Google access or refresh tokens in `supplier_communication_*` tables.

Minimum send-only OAuth scope can be:

```text
https://www.googleapis.com/auth/gmail.send
```

Inbound automatic synchronization will need a read/modify-capable connection (or a dedicated webhook/push integration), which is intentionally separate from the send-only provider.

## Structured reply contract

Example supplier response:

```text
MAKSTER QUOTE
RFQ_ID: <rfq id>
RESPONSE_TOKEN: <token>
TOTAL_PRICE: 428
DELIVERY_PRICE: 18
LEAD_DAYS: 5
DELIVERY_MODE: supplier_delivery
SERVICES: cutting,edging
VALID_UNTIL: 2026-09-10T12:00:00Z
NOTE: Includes delivery
END MAKSTER QUOTE
```

Makster validates the result against the original RFQ and supplier capabilities before importing it into Procurement.

A reply such as `around €400 next week` is never silently converted into a quote in 1.3.

## API

- `POST /api/v1/procurement/rfqs/:rfqId/communications/send`
- `GET /api/v1/procurement/rfqs/:rfqId/communications`
- `POST /api/v1/procurement/rfqs/:rfqId/communications/inbound`
- `POST /api/v1/procurement/communications/reminders/run`

## Reminder scheduling

`dueReminderCandidates()` is deterministic business logic. The production scheduler should call the reminder endpoint/server service from a server-side worker or scheduled Edge Function. Supabase supports scheduling Edge Functions with `pg_cron` + `pg_net`; credentials should live in Vault/secret management.

## Trust boundary

Email provider = transport.

Procurement Engine = pricing validation/ranking.

Engineering Engine = furniture truth.

No email provider has direct permission to modify ProjectModel, Engineering, Production Pack or manufacturing data.
