# Makster Production Worker 0.9

The Production Worker is a server-only service. It is the only component that may turn an approved signed release into stored machine-output artifacts.

## Runtime sequence

```text
pgmq.read(queue, visibility timeout)
  ↓
claim authoritative production_queue_jobs row
  ↓
lease token + worker id + attempt counter
  ↓
verify signed release files + Ed25519 public key
  ↓
verify approval binding + revision + release SHA
  ↓
verify machine profile SHA
  ↓
verify postprocessor id/version/artifact SHA
  ↓
regenerate machine package
  ↓
compare machine package SHA with enqueue-time SHA
  ↓
heartbeat / extend queue visibility
  ↓
write immutable machine artifacts to private Storage
  ↓
record artifact metadata
  ↓
mark completed
  ↓
pgmq.archive(message)
```

A queue message is never authority. It only identifies the job to load from PostgreSQL.

## Delivery semantics

The worker uses `pgmq.read` rather than `pop`.

`read` makes the message invisible during the visibility window without deleting it. If the worker crashes, the message becomes visible again. The worker archives the message only after successful artifact persistence, or after a terminal validation failure.

This avoids the at-most-once failure mode of deleting a message before machine-output generation is safely committed.

## Lease

Every claim receives:

- `worker_id`
- random `lease_token`
- `lease_expires_at`
- queue `message_id`
- incremented `attempt_count`

All worker mutation RPCs require the same `worker_id + lease_token` and refuse expired leases.

The worker heartbeats before artifact writes and extends both:

- PostgreSQL lease expiry;
- PGMQ visibility timeout.

## Retry policy

Transient failures use exponential backoff:

```text
30s → 60s → 120s → 240s ... max 1800s
```

The job remains the same job; no duplicate business job is created.

Default maximum attempts: `5`.

After the maximum is exhausted, the job becomes terminal `failed`, the queue message is archived, and a `dead_letter` event is written.

## Terminal failures

Examples that are deliberately not retried:

- release signature/hash mismatch;
- approval mismatch;
- machine-profile drift;
- postprocessor version/artifact drift;
- regenerated machine-package hash mismatch;
- unverified live machine or postprocessor;
- conflicting bytes already stored at an immutable artifact path.

Retrying those conditions would not make the job safer.

## Artifact paths

Machine outputs are written under the existing private manufacturing bucket:

```text
<organization>/<project>/release/<release>/machine/<machine>/<job>/<filename>
```

A worker retry may reuse an existing path only when SHA-256 and byte length are identical.

Every completed package also contains:

`machine-package-manifest.json`

with the release hash, machine-profile hash, postprocessor artifact hash and exact output-file hashes.

## Supabase credentials

Use a server-only secret key:

```text
SUPABASE_SECRET_KEY=sb_secret_...
```

Do not ship this key to the browser or desktop client.

Legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted only as a migration fallback in the 0.9 worker entrypoint.

The worker does not expose `pgmq_public` to the browser. Service-only RPC functions wrap queue operations and explicitly revoke EXECUTE from `PUBLIC`, `anon` and `authenticated`.

## Real postprocessor boundary

The live worker registry intentionally contains **zero real CNC postprocessors** in 0.9.

A real adapter must be registered explicitly and its implementation artifact SHA-256 must match `machine_postprocessor_profiles.artifact_sha256` in PostgreSQL.

No exact machine/controller = no executable CNC output.
