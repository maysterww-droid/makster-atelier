# Makster Creative Studio — Usability 1.1

Branch: `creative-studio-0.1`

## Scope

Usability 1.1 adds private cloud media sync and a browser Download Manager without moving Creative Studio away from its local-first workflow.

### Creative Cloud

- Supabase project: `Makster-Staging`
- Private bucket: `creative-studio-private`
- Edge Function: `creative-media`
- Browser never receives a Supabase secret/service-role key.
- Media upload/download uses short-lived signed URLs.
- The browser stores only the publishable key plus the user's capability-style Pair Code.
- Workspace tokens are stored in Postgres only as SHA-256 hashes.
- New workspace registration is not public; authorized workspaces are provisioned server-side.

Tables:
- `public.creative_studio_workspaces`
- `public.creative_studio_media`
- `public.creative_studio_snapshots`

Direct `anon` and `authenticated` table access is revoked. RLS stays enabled; the Edge Function performs server-side access through the Supabase secret key.

## Media sync

Creative Studio remains local-first.

1. A file enters Production Inbox / Media Library.
2. If Auto-sync is OFF, nothing is uploaded automatically.
3. `Sync missing` uploads only media signatures not already in the cloud.
4. Before upload, the Edge Function returns a signed upload URL.
5. The browser uploads directly to the private Storage bucket.
6. Metadata is finalized in `creative_studio_media`.
7. Duplicate signatures are reused rather than uploaded again.

Auto-sync is intentionally OFF by default to prevent unexpected bandwidth/storage use.

## Project snapshots

`Save snapshot` stores Creative Studio metadata/state in `creative_studio_snapshots`.

Media blobs are not embedded in snapshots. On another device:

1. Pair the device with the same Pair Code.
2. Restore the latest snapshot.
3. Use `Restore media` to enqueue missing media into Download Manager.

## Download Manager

Download Manager handles:
- Restore to Studio (downloads cloud media into IndexedDB/local Media Library)
- Download file (normal browser download)
- progress
- failed/retry state
- completed queue cleanup

Signed download URLs expire after 15 minutes.

## Security notes

- Never commit a Pair Code or token into the repository.
- Never expose `SUPABASE_SECRET_KEYS` or `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- `creative-media` is deployed with platform JWT verification disabled because it performs its own capability-token authentication.
- The public health endpoint exposes only service status, bucket name and version.
- Cloud media is private; object access is signed and time-limited.

## Current backend deployment

Edge Function source is versioned in:
`supabase/functions/creative-media/index.ts`

The live Supabase schema/bucket were created for Usability 1.1 in the Makster staging project.
