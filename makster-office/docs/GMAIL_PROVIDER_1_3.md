> **Superseded in Makster 1.4:** the manual `GMAIL_OAUTH_ACCESS_TOKEN` prototype is retained here only as historical 1.3 documentation. Runtime 1.4 uses organization-scoped OAuth Connections and server-side refresh-token encryption; do not configure the old token variable.

# Gmail Provider 1.3

## Send contract

`GmailApiEmailProvider` performs:

```text
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
Authorization: Bearer <OAuth access token>
Content-Type: application/json
```

Request body:

```json
{
  "raw": "<base64url RFC2822 MIME>",
  "threadId": "<existing Gmail thread id when replying>"
}
```

Makster generates an RFC `Message-ID` for the RFQ root message and stores it. Reminders use the original Gmail `threadId` plus RFC `In-Reply-To` and `References` headers and the same subject.

## Production OAuth

The current prototype accepts `GMAIL_OAUTH_ACCESS_TOKEN` only to prove the provider contract. A commercial deployment needs:

- Google OAuth consent/configuration;
- encrypted refresh-token storage or a managed connection layer;
- per-organization provider account binding;
- token refresh server-side;
- revoke/disconnect flow;
- audit log of sending identity.

Do not expose OAuth tokens to the browser.

## Inbound mail

1.3 exposes a provider-neutral inbound import endpoint and parser. It does not claim that Gmail inbox synchronization is complete. A future connector can feed messages into this endpoint from Gmail history/push/polling without changing Procurement logic.
