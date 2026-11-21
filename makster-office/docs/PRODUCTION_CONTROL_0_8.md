# Makster Production Control 0.8

## Separation of duties

Project editors may prepare furniture. Production operators may execute approved production. CNC release approval is reserved for `owner`, `admin`, or `technologist`.

The intended sequence is:

1. Compile exact Project Revision.
2. Build Release Trust preview.
3. Reserve one `releaseId` and compute `approvalFingerprint`.
4. Create Approval Request.
5. Authorized human approves that fingerprint.
6. Server rebuilds the release from authoritative inputs using the same `releaseId`.
7. Fingerprint must still match.
8. Server signs with Ed25519.
9. Machine/postprocessor gate runs.
10. Durable Production Job is persisted.
11. PGMQ gets only a dispatch message.

## Why approval is before signature

The signature proves what Makster released. The approval proves a human authorized that exact release candidate. Putting the approval fingerprint inside the signed manifest cryptographically binds both events.

## Queue source of truth

`production_queue_jobs` is durable state. PGMQ messages are delivery instructions, not authorization artifacts.

A worker should always re-query:

- release package;
- approval request;
- signing key status;
- machine status;
- postprocessor profile;
- job status.

before generating final machine output.

## Machine postprocessors

Postprocessor trust levels:

- `preview_only` — useful for integration/debugging, never executable;
- `test_only` — automated test proof, forbidden in live DB queue;
- `verified` — controller-specific implementation validated for production.

Real `verified` profiles need evidence such as vendor SDK/specification or documented manual verification.
