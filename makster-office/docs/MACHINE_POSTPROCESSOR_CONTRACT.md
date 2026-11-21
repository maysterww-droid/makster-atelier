# Machine Postprocessor Contract

A Makster postprocessor consumes a **signed approved release** plus the exact Engineering Artifact and a Machine Profile.

It must declare:

- stable `id`;
- version;
- trust level;
- whether output is machine-executable;
- supported operation types;
- controller/machine applicability in the persistent registry.

It returns a Machine Package whose individual files have SHA-256 hashes.

## Neutral IR

`makster-neutral-cnc-v1` is deliberately non-executable. It contains normalized parts and machining operations and is the integration boundary for future real controller adapters.

## What is forbidden

A postprocessor must not:

- estimate missing coordinates;
- silently convert unsupported operations;
- emit executable output when its profile is `preview_only`;
- run against a different machine profile than the one it was registered for;
- reuse approval from a changed release fingerprint.
