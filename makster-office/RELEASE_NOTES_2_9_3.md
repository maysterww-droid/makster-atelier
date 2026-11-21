# Makster AI 2.9.3 — Installation Closeout & Handover

2.9.3 closes the installation lifecycle with a controlled Closeout Gate.

Closeout states:
- NOT_READY
- READY_TO_SIGN
- SIGNED

Closeout is blocked by:
- blocking installation issues
- open site tasks
- open site issues
- unresolved proposed/approved site change requests
- open MAJOR punch-list items

Punch list:
- minor / major
- open / closed / cancelled
- creator / closer / timestamps
- source Revision
- optional furniture target

Handover:
- can be signed only when Closeout = READY_TO_SIGN
- creates a new immutable Project Revision
- records signedBy, client, installer, timestamp, notes, source Revision

Installer UI:
- Punch item creation
- Punch item closure
- Closeout blockers
- Handover signing
- Signed handover summary

Production Pack:
- punch-list.csv
- installation-handover.txt

Safety:
- a signed handover cannot be created while Closeout blockers remain
- expectedRevision is required by API write actions
- every punch-list or handover action creates a new Revision
