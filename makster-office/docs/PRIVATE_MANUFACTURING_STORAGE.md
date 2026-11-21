# Private Manufacturing Storage — 0.7

Supabase bucket:

```text
makster-manufacturing-private
```

The bucket is private.

## Path layout

Raw BXF source:

```text
<organization-id>/<project-id>/bxf/<import-id>/<file.bxf>
```

Server-generated release file:

```text
<organization-id>/<project-id>/release/<release-id>/<file>
```

Authenticated organization contributors may upload only under the `/bxf/` branch. No authenticated UPDATE or DELETE policy is created for manufacturing source files, so uploaded evidence is immutable from normal client code.

Release files are written server-side only.

The `bxf_imports` row stores SHA-256 and the Storage path. The release manifest stores the source checksum/fingerprint/adapter provenance used by machining operations.
