# Makster AI 2.9.2 — Site Change Request & As-Built

2.9.2 adds controlled geometry changes originating from the installation site.

Workflow:
1. Installer proposes a change against a specific furniture item and current Revision.
2. Geometry is NOT changed yet.
3. Designer/constructor approves or rejects the request.
4. Only an approved request can be applied.
5. Before application Makster recomputes installation collisions.
6. A change that increases Blocking collisions is rejected.
7. Accepted application creates a new Revision and an As-Built record.

New ProjectModel data:
- installationChangeRequests[]
- asBuiltRecords[]

Statuses:
- proposed
- approved
- rejected
- applied

Production Pack additions:
- site-change-requests.csv
- as-built.csv

Safety:
- installer cannot silently rewrite production geometry;
- expectedRevision is required at every API step;
- proposed changes are separated from applied geometry;
- applied geometry is recorded as-built;
- change is rejected if it creates more blocking installation collisions.
