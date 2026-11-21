# Makster AI 3.4.0 — Secure Client Share Links & External Portal Access

## Purpose

3.4 turns the internal Client Portal preview into a controlled external client-access layer.

The external portal is deliberately isolated from Makster's normal project API.

## Share-link security model

A Client Share Link stores only:
- link ID
- SHA-256 token hash
- active/revoked state
- created by / time
- expiration
- one-time flag
- approval-response permission
- approval scope
- source Revision
- optional label

The raw 256-bit random token is returned only once when the owner creates the link.

### Token transport

The share URL is:

`/client/<project-id>#<256-bit-token>`

The secret token is stored in the URL fragment.

Browser URL fragments are not sent in the initial HTTP request and therefore do not appear in the normal server request path/access log.

The public page sends the token only through:
`x-client-share-token`

to the dedicated public Client Portal API.

## Cryptography

- 256-bit CSPRNG token via Web Crypto
- SHA-256 stored token hash
- constant-time hash comparison
- SHA-256 implementation verified against standard known vectors

The raw token is not stored in ProjectModel, owner link lists, Production Pack, or public HTML.

## Public API boundary

Public endpoints:
- GET `/api/v1/public/client/:projectId`
- POST `/api/v1/public/client/:projectId/approvals/:approvalId/respond`

They use the `x-client-share-token` header.

The token is NOT accepted as a Bearer token for normal Makster APIs.

For persistent Supabase deployments the server resolves public share requests through a privileged server-only repository channel using:
- `SUPABASE_SECRET_KEY`, or
- `SUPABASE_SERVICE_ROLE_KEY`

No Supabase service secret is sent to the browser.

## External page

GET:
`/client/:projectId#token`

renders a standalone responsive client page.

Security headers:
- `Cache-Control: no-store`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- Content Security Policy
- `frame-ancestors 'none'`

## Link controls

Owner can create:
- expiring links
- reusable links
- one-time approval links
- read-only links
- approval-enabled links

Owner can revoke a link at any time.

Expired, revoked, or consumed one-time links return a generic invalid-link response.

Invalid expiration input is returned as HTTP 400, not an internal server error.

## Approval least privilege

When an approval-enabled link is created it is scoped to the client approval requests that are PENDING at that moment.

A later-created approval cannot be answered using an older share link.

This prevents a previously shared URL from automatically gaining authority over new commercial/design decisions.

## Client response audit

The external client cannot choose the `respondedBy` audit identity.

For public share responses Makster records the client name from Job Control (or `client-via-share` fallback).

A successful external approval creates a new immutable Project Revision with source=`client`.

A one-time link is consumed in the same revision and cannot be used again.

## Technical approval fingerprint

Design approval is no longer considered valid merely because an old approved record exists.

Every new Client Approval Request stores a SHA-256 fingerprint of:
- site geometry
- furniture
- material/hardware selections
- constraints
- project type/schema

Administrative revisions such as payment updates do not invalidate the approval.

A technical design change changes the fingerprint and Job Control blocks later stages with:

`Project design changed after client approval. New approval is required.`

Legacy approvals without a fingerprint require re-approval.

## Rate limiting

Public share APIs include process-local rate limits:
- 60 public portal reads / minute / remote address
- 12 approval submissions / minute / remote address

For multi-instance/cloud deployment an edge/WAF distributed rate limiter is still recommended.

## Production Pack audit

Revision-specific files:
- `client-approvals.csv`
  - includes the technical content fingerprint
- `client-portal-snapshot.json`
- `client-share-links.csv`
  - contains link metadata and approval scope count
  - never contains raw tokens or token hashes

## Security boundary

The external ClientPortalView does NOT expose:
- supplier identities/orders
- purchasing prices
- committed purchasing cost
- actual internal cost
- margin
- cost entries
- Engineering blockers
- internal project notes
- token hashes
- service credentials
