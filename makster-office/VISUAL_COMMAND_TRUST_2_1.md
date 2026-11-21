# Visual Command Trust 2.1

The trust boundary remains server-side. The browser can preview geometry, but it cannot persist arbitrary patches.

New checks in 2.1:

- proportional cabinet resize preserves exact total module width;
- scaled module widths must remain 100–4000 mm;
- shelf elevations are validated and cannot be closer than 32 mm;
- X/Y/Z and rotation are validated before furniture placement;
- rotation-aware furniture footprint must remain inside the assigned/primary room;
- room resize cannot clip existing furniture;
- restore accepts a revision number only, then fetches the historical snapshot from the repository; the browser never supplies the snapshot being restored;
- expectedRevision optimistic concurrency applies to both visual commands and restore.

A successful interaction still ends in one immutable Revision and one downstream Engineering recalculation.
